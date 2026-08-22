// Supabase Edge Function: generate-itinerary
//
// Calls OpenRouter (server-side, so the API key never reaches the browser)
// to produce a structured day-by-day trip itinerary suggestion.
//
// Deploy via the Supabase Dashboard: Edge Functions -> Create a new function
// -> name it "generate-itinerary" -> paste this file -> Deploy.
// Then add the secret: Edge Functions -> Manage secrets -> OPENROUTER_API_KEY.

const OPENROUTER_MODEL = 'openai/gpt-4o-mini'

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

Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "city": "string",
      "activities": [
        { "time": "HH:MM", "name": "string", "category": "string", "estimated_cost": 0 }
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
