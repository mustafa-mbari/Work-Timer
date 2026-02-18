export type View = 'timer' | 'week' | 'stats' | 'settings'

export type TimerMode = 'stopwatch' | 'manual'

export type EntryType = 'manual' | 'stopwatch' | 'pomodoro'

export type TimerStatus = 'idle' | 'running' | 'paused'

export interface TimeEntry {
  id: string
  date: string // ISO date string YYYY-MM-DD
  startTime: number // Unix timestamp ms
  endTime: number // Unix timestamp ms
  duration: number // Duration in ms
  projectId: string | null
  taskId: string | null
  description: string
  type: EntryType
  tags: string[]
  link?: string
}

export interface Project {
  id: string
  name: string
  color: string // Hex color
  targetHours: number | null
  archived: boolean
  createdAt: number
}

export interface Tag {
  id: string
  name: string
}

export interface ReminderSettings {
  enabled: boolean       // default: true
  dayOfWeek: number      // 0-6 (0=Sunday), default: 5 (Friday)
  hour: number           // 0-23, default: 14
  minute: number         // 0-59, default: 0
}

export interface Settings {
  workingDays: number // 5, 6, or 7
  weekStartDay: 0 | 1 // 0 = Sunday, 1 = Monday
  idleTimeout: number // Minutes
  theme: 'light-soft' | 'light-paper' | 'light-sepia' | 'dark-charcoal' | 'dark-mocha' | 'dark-midnight' | 'system'
  language: 'en' | 'ar'
  notifications: boolean
  dailyTarget: number | null // Hours
  weeklyTarget: number | null // Hours
  pomodoro: PomodoroSettings
  floatingTimerAutoShow: boolean // Auto-show floating widget when timer starts
  reminder: ReminderSettings
}

export interface TimerState {
  status: TimerStatus
  projectId: string | null
  description: string
  startTime: number | null // Unix timestamp when started
  elapsed: number // Accumulated elapsed time in ms (from previous pauses)
  pausedAt: number | null // Timestamp when paused
  continuingEntryId: string | null // Entry ID being continued (to extend instead of creating new)
}

// Idle detection
export interface IdleInfo {
  idleStartedAt: number | null // When user went idle
  idleDuration: number // How long user was idle (ms)
  pending: boolean // Waiting for user decision
}

// Pomodoro
export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'

export interface PomodoroSettings {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
  soundEnabled: boolean
}

export interface PomodoroState {
  active: boolean
  phase: PomodoroPhase
  phaseStartedAt: number | null // Unix timestamp when current phase started
  phaseDuration: number // Total duration of current phase in ms
  sessionsCompleted: number
  totalWorkTime: number // ms
}

// Auth
export interface AuthSession {
  userId: string
  email: string
  accessToken: string
  refreshToken: string
  expiresAt: number // Unix timestamp seconds
}

export interface SubscriptionInfo {
  plan: 'free' | 'premium_monthly' | 'premium_yearly' | 'premium_lifetime'
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete'
  currentPeriodEnd: string | null // ISO datetime
  cancelAtPeriodEnd: boolean
  grantedBy: 'stripe' | 'domain' | 'promo' | 'admin_manual' | null
}

// Cloud sync
export interface SyncQueueItem {
  id: string           // nanoid
  table: 'time_entries' | 'projects' | 'tags' | 'user_settings'
  recordId: string     // Local entity ID
  action: 'upsert' | 'delete'
  updatedAt: number    // Unix ms timestamp
  date?: string        // YYYY-MM-DD — for time_entries, enables O(1) lookup instead of full scan
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export interface SyncState {
  status: SyncStatus
  lastSyncAt: string | null    // ISO datetime
  pendingCount: number
  errorMessage: string | null
}

// Message types for popup <-> background communication
export type MessageAction =
  | 'START_TIMER'
  | 'PAUSE_TIMER'
  | 'RESUME_TIMER'
  | 'STOP_TIMER'
  | 'GET_TIMER_STATE'
  | 'IDLE_KEEP'
  | 'IDLE_DISCARD'
  | 'IDLE_DISMISS'
  | 'START_POMODORO'
  | 'STOP_POMODORO'
  | 'SKIP_POMODORO_PHASE'
  | 'GET_POMODORO_STATE'
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_STATE'
  | 'SYNC_NOW'
  | 'SYNC_STATUS'
  | 'UPLOAD_ALL'
  | 'GET_SUBSCRIPTION'
  | 'SYNC_REMOTE_UPDATE'
  | 'ACCOUNT_SWITCH_CHOICE'

export interface TimerMessage {
  action: MessageAction
  payload?: {
    projectId?: string | null
    description?: string
    continuingEntryId?: string | null
  }
}

export interface TimerResponse {
  success: boolean
  state?: TimerState
  entry?: TimeEntry
  error?: string
  idleInfo?: IdleInfo
  pomodoroState?: PomodoroState
  session?: AuthSession
  subscription?: SubscriptionInfo
  syncState?: SyncState
  accountSwitch?: boolean
  previousUserId?: string
  newUserId?: string
}
