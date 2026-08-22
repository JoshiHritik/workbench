export interface NotificationPrefs {
  tripReminders: boolean
  budgetAlerts: boolean
  draftNudges: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  tripReminders: true,
  budgetAlerts: true,
  draftNudges: true,
}

const KEY = 'globetrotter_notification_prefs'

export function loadNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFS
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs) {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}
