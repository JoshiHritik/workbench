// Supabase Edge Function: generate-itinerary
//
// Calls OpenRouter (server-side, so the API key never reaches the browser)
// to produce a structured day-by-day trip itinerary suggestion.
//
// Deploy via the Supabase Dashboard: Edge Functions -> Create a new function
// -> name it "generate-itinerary" -> paste this file -> Deploy.
// Then add the secret: Edge Functions -> Manage secrets -> OPENROUTER_API_KEY.
//
// Requires supabase/add_rate_limiting_and_fixes.sql to have been run first
// (creates the itinerary_generation_log table this function reads/writes).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENROUTER_MODEL = 'openai/gpt-4o-mini'

// Generous enough for a real "regenerate a few times while planning" session,
// tight enough that a script hammering this endpoint can't run up the
// OpenRouter bill unnoticed.
const RATE_LIMIT_MAX_REQUESTS = 8
const RATE_LIMIT_WINDOW_MINUTES = 15

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  destination: string
  startDate: string
  endDate: string
  budget?: number | null
  tripVibe?: string | null
  description?: string | null
}

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.round(ms / 86400000) + 1)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Require a real, signed-in GlobeTrotter user — without this, the
    // function URL is public and anyone could call it directly (with no
    // Supabase session at all) and spend the OPENROUTER_API_KEY budget.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    // Uses the caller's own JWT (never the service role key), so every
    // query below runs as that user and is still subject to RLS.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not signed in.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString()
    const { count: recentCount, error: rateError } = await supabase
      .from('itinerary_generation_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', windowStart)

    if (rateError) {
      return new Response(JSON.stringify({ error: `Rate limit check failed: ${rateError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if ((recentCount ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
      return new Response(
        JSON.stringify({ error: `Too many itinerary requests. Try again in a few minutes.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Logged before calling OpenRouter, so two requests fired at once can't
    // both slip through under the limit.
    await supabase.from('itinerary_generation_log').insert({ user_id: user.id })

    const body: RequestBody = await req.json()
    const { destination, startDate, endDate, budget, tripVibe, description } = body

    if (!destination || !startDate || !endDate) {
      return new Response(JSON.stringify({ error: 'destination, startDate and endDate are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY is not configured on the server.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tripLength = daysBetween(startDate, endDate)

    const prompt = `Plan a ${tripLength}-day trip to ${destination}, from ${startDate} to ${endDate}.
${budget ? `Total budget: ${budget}.` : ''}
${tripVibe ? `Trip vibe: ${tripVibe}.` : ''}
${description ? `Notes from the traveler: ${description}` : ''}

For every activity, name a SPECIFIC real (or realistic, if you're not certain) place — a named
restaurant, cafe, landmark, or venue — never a generic placeholder like "a local restaurant",
"breakfast at the hotel", or a vague qualifier standing in for a name like "a renowned restaurant"
or "a popular cafe". For example write "Breakfast at Cafe Bombay" or "Lunch at Gordhan Thal", not
just "Breakfast" or "Lunch at a renowned restaurant". For each activity also include one short,
specific "tip": a dish to try, a detail to notice, or advice a local would give — something that
makes it feel like real insider knowledge, not a generic sentence.

For "estimated_cost", give a realistic price in Indian Rupees (INR) for that specific activity,
calibrated to the destination's actual cost of living — not a flat number reused everywhere. A
coffee or snack in a low-cost destination might be ₹100-300, but the same in an expensive city
(Switzerland, Japan, the US, Western Europe) should realistically be ₹400-900; a sit-down meal
might be ₹200-500 in a budget destination versus ₹1500-4000 in an expensive one; museum or
landmark entry fees, tours, and activities should scale the same way. Never default to Indian
price levels for a destination that isn't India.

Only include activities that plausibly and actually exist in this specific destination. Do not
invent activities that aren't known to exist there — for example, don't suggest river rafting,
scuba diving, or skiing unless that destination is genuinely known for it. When unsure, prefer
safe, well-established options: known landmarks, markets, temples, museums, parks, or well-known
local restaurants. Accuracy matters more than variety.

Use 12-hour time with AM/PM (e.g. "9:00 AM", "2:30 PM"), never 24-hour time.

For each day, also write a short 3-6 word "theme" that summarizes what that day is about (e.g.
"Old City Heritage and Riverfront Evening"). For each activity, also include a short "best_time"
field: 2-4 words on the best time to go, considering crowds, light for photos, or opening hours
(e.g. "Early morning, fewer crowds" or "Sunset for photos").

Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "city": "string",
      "theme": "string",
      "activities": [
        { "time": "9:00 AM", "name": "string", "category": "string", "estimated_cost": 0, "tip": "string", "best_time": "string" }
      ]
    }
  ]
}`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a travel planning assistant. Always respond with strictly valid JSON, nothing else.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return new Response(JSON.stringify({ error: `OpenRouter error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    let itinerary
    try {
      itinerary = JSON.parse(content)
    } catch {
      return new Response(JSON.stringify({ error: 'Model did not return valid JSON.', raw: content }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(itinerary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
