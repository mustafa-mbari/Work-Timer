/**
 * Weekly reminder system: scheduling and notification handling.
 */
import { getSettings, REMINDER_ALARM, REMINDER_RETRY_ALARM } from './storage'

// ── Scheduling ──

function getNextReminderTime(dayOfWeek: number, hour: number, minute: number): number {
  const now = new Date()
  const target = new Date()
  target.setHours(hour, minute, 0, 0)

  const currentDay = now.getDay()
  let daysUntil = dayOfWeek - currentDay
  if (daysUntil < 0) daysUntil += 7
  if (daysUntil === 0 && now >= target) daysUntil = 7

  target.setDate(target.getDate() + daysUntil)
  return target.getTime()
}

export async function scheduleReminder(): Promise<void> {
  const settings = await getSettings()
  const reminder = settings.reminder
  if (!reminder || !reminder.enabled) {
    await chrome.alarms.clear(REMINDER_ALARM)
    return
  }
  const when = getNextReminderTime(reminder.dayOfWeek, reminder.hour, reminder.minute)
  await chrome.alarms.create(REMINDER_ALARM, { when })
}

// ── Notification handlers (registered at module level for MV3) ──

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId !== 'weekly-reminder') return

  chrome.notifications.clear('weekly-reminder')
  await chrome.alarms.clear(REMINDER_RETRY_ALARM)

  if (buttonIndex === 0) {
    // "Done" — confirmed, clear pending and schedule next week
    await chrome.storage.local.remove('reminderPending')
    void scheduleReminder()
  } else {
    // "Remind me later" — retry in 1 hour
    await chrome.alarms.create(REMINDER_RETRY_ALARM, { delayInMinutes: 60 })
  }
})

// Clicking the notification body — treat as "remind later"
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId !== 'weekly-reminder') return
  chrome.notifications.clear('weekly-reminder')
  const { reminderPending } = await chrome.storage.local.get('reminderPending')
  if (reminderPending) {
    await chrome.alarms.create(REMINDER_RETRY_ALARM, { delayInMinutes: 60 })
  }
})

// Notification dismissed (closed without action) — retry in 1 hour
chrome.notifications.onClosed.addListener(async (notificationId) => {
  if (notificationId !== 'weekly-reminder') return
  const { reminderPending } = await chrome.storage.local.get('reminderPending')
  if (reminderPending) {
    await chrome.alarms.create(REMINDER_RETRY_ALARM, { delayInMinutes: 60 })
  }
})
