// Work Timer — Floating Mini Timer Content Script
// Runs on every page. Shows a draggable overlay widget when the timer is active.

// NOTE: Content scripts are injected as plain scripts by Chrome — they CANNOT
// use ES module imports or load shared chunks. All utilities must be inlined.
// Vite's ?raw import inlines the CSS as a string constant at build time.
import STYLES from './widget.css?raw'

interface TimerState {
  status: 'idle' | 'running' | 'paused'
  elapsed: number
  startTime: number | null
  projectId: string | null
  description: string
}

interface Project {
  id: string
  name: string
  color: string
}

function getElapsed(state: TimerState): number {
  if (state.status === 'running' && state.startTime) {
    return state.elapsed + (Date.now() - state.startTime)
  }
  return state.elapsed
}

type ContentMessage =
  | { action: 'TIMER_SYNC'; state: TimerState; projects: Project[] }
  | { action: 'RESTORE_TITLE'; originalTitle: string }
  | { action: 'SHOW_FLOATING_TIMER'; state: TimerState; projects: Project[] }

const POS_KEY = 'floatingTimerPos'
const MIN_KEY = 'floatingTimerMin'
const HIDDEN_KEY = 'floatingTimerHidden'

const MINI_WIDTH = 96   // wide enough for H:MM:SS at tabular-nums
const FULL_WIDTH = 200
const MINI_HEIGHT = 40  // drag-handle only
const FULL_HEIGHT = 100 // drag-handle + project name + action buttons + padding

let hostEl: HTMLElement | null = null
let shadow: ShadowRoot | null = null
let tickInterval: ReturnType<typeof setInterval> | null = null
let dragAbortController: AbortController | null = null
let currentState: TimerState | null = null
let lastProjects: Project[] = []   // cached for visibility-change restores
let isMinimized = false
let isHidden = false       // user explicitly closed via ×; persisted
let autoShowEnabled = true // from settings; cached at init
let themeIsDark = true     // derived from extension theme setting
let posX = -1              // distance from right edge; -1 = auto (bottom-right)
let posY = -1

// ---- Time Formatting ----

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${mm}:${ss}`
}

// ---- Position / State Persistence ----

async function loadPersistedState(): Promise<void> {
  const result = await chrome.storage.local.get([POS_KEY, MIN_KEY, HIDDEN_KEY, 'settings'])
  const pos = result[POS_KEY] as { x: number; y: number } | undefined
  if (pos) { posX = pos.x; posY = pos.y }
  isMinimized = !!(result[MIN_KEY] as boolean | undefined)
  isHidden = !!(result[HIDDEN_KEY] as boolean | undefined)
  const s = result['settings'] as { floatingTimerAutoShow?: boolean; theme?: string } | undefined
  autoShowEnabled = s?.floatingTimerAutoShow !== false // default true
  themeIsDark = !s?.theme?.startsWith('light') // 'light-*' → false; 'dark-*' / undefined → true
}

function savePosition(): void {
  if (!hostEl) return
  const { right, bottom } = getCurrentPos()
  chrome.storage.local.set({
    [POS_KEY]: { x: right, y: bottom },
    [MIN_KEY]: isMinimized,
  })
}

function persistHidden(value: boolean): void {
  isHidden = value
  chrome.storage.local.set({ [HIDDEN_KEY]: value })
}

// ---- Host Element Styling ----

function buildHostStyle(right: number, bottom: number): string {
  const width = isMinimized ? MINI_WIDTH : FULL_WIDTH
  return [
    'position:fixed',
    `right:${right}px`,
    `bottom:${bottom}px`,
    'z-index:2147483647',
    'display:block',
    `width:${width}px`,
  ].join(';')
}

function getCurrentPos(): { right: number; bottom: number } {
  const style = hostEl?.getAttribute('style') || ''
  return {
    right: parseInt((style.match(/right:(\d+)px/) ?? ['', '20'])[1], 10),
    bottom: parseInt((style.match(/bottom:(\d+)px/) ?? ['', '20'])[1], 10),
  }
}

function applyHostStyle(): void {
  if (!hostEl) return
  const { right, bottom } = getCurrentPos()
  // Clamp to viewport using the NEW size (called after isMinimized has been toggled)
  const widgetWidth = isMinimized ? MINI_WIDTH : FULL_WIDTH
  const clampedRight = Math.max(0, Math.min(window.innerWidth - widgetWidth, right))
  const widgetHeight = isMinimized ? MINI_HEIGHT : FULL_HEIGHT
  const clampedBottom = Math.max(0, Math.min(window.innerHeight - widgetHeight, bottom))
  hostEl.setAttribute('style', buildHostStyle(clampedRight, clampedBottom))
}

// ---- Build Widget DOM ----

function buildWidget(): void {
  hostEl = document.createElement('work-timer-widget')
  hostEl.setAttribute('data-scheme', themeIsDark ? 'dark' : 'light')
  const right = posX >= 0 ? posX : 20
  const bottom = posY >= 0 ? posY : 20
  hostEl.setAttribute('style', buildHostStyle(right, bottom))

  shadow = hostEl.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = STYLES

  const widget = document.createElement('div')
  widget.id = 'widget'
  widget.className = isMinimized ? 'mini' : 'full'

  widget.innerHTML = `
    <div id="drag-handle">
      <span id="pulse" class="paused"></span>
      <span id="timer">00:00</span>
      <button id="close-btn" title="Close widget">✕</button>
    </div>
    <div id="body">
      <div id="project-name">No project</div>
      <div id="actions">
        <button class="action-btn btn-pause" id="btn-pause" title="Pause">⏸ Pause</button>
        <button class="action-btn btn-stop" id="btn-stop" title="Stop">⏹ Stop</button>
      </div>
    </div>
  `

  shadow.appendChild(style)
  shadow.appendChild(widget)
  ;(document.body || document.documentElement).appendChild(hostEl)

  // Close button → dismiss widget; won't auto-reappear until user shows it again
  shadow.getElementById('close-btn')!.addEventListener('click', (e) => {
    e.stopPropagation()
    persistHidden(true)
    hideWidget()
  })

  // Click on drag-handle (not a button) → toggle mini/full
  shadow.getElementById('drag-handle')!.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button')) return
    isMinimized = !isMinimized
    widget.className = isMinimized ? 'mini' : 'full'
    applyHostStyle()
    savePosition()
  })

  // Pause/Resume
  shadow.getElementById('btn-pause')!.addEventListener('click', async () => {
    if (currentState?.status === 'running') {
      await chrome.runtime.sendMessage({ action: 'PAUSE_TIMER' })
    } else if (currentState?.status === 'paused') {
      await chrome.runtime.sendMessage({ action: 'RESUME_TIMER' })
    }
  })

  // Stop
  shadow.getElementById('btn-stop')!.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'STOP_TIMER' })
  })

  setupDrag()
}

function setupDrag(): void {
  if (!shadow || !hostEl) return

  // Clean up previous drag listeners if any
  dragAbortController?.abort()
  dragAbortController = new AbortController()
  const { signal } = dragAbortController

  const handle = shadow.getElementById('drag-handle')!
  let isDragging = false
  let startMouseX = 0
  let startMouseY = 0
  let startRight = 0
  let startBottom = 0

  handle.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return
    isDragging = true
    startMouseX = e.clientX
    startMouseY = e.clientY
    const pos = getCurrentPos()
    startRight = pos.right
    startBottom = pos.bottom
    e.preventDefault()
  }, { signal })

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !hostEl) return
    const dx = startMouseX - e.clientX
    const dy = startMouseY - e.clientY
    const widgetWidth = isMinimized ? MINI_WIDTH : FULL_WIDTH
    const newRight = Math.max(0, Math.min(window.innerWidth - widgetWidth, startRight + dx))
    const widgetHeight = isMinimized ? MINI_HEIGHT : FULL_HEIGHT
    const newBottom = Math.max(0, Math.min(window.innerHeight - widgetHeight, startBottom + dy))
    hostEl.setAttribute('style', buildHostStyle(newRight, newBottom))
  }, { signal })

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false
      savePosition()
    }
  }, { signal })
}

// ---- Update Widget State ----

function updateWidget(state: TimerState, projs: Project[]): void {
  if (!shadow) return

  currentState = state

  const widget = shadow.getElementById('widget')!
  const pulse = shadow.getElementById('pulse')!
  const timerEl = shadow.getElementById('timer')!
  const projectEl = shadow.getElementById('project-name')!
  const btnPause = shadow.getElementById('btn-pause')!

  if (state.status === 'idle') {
    removeWidget()
    return
  }

  pulse.className = state.status === 'running' ? 'running' : 'paused'
  timerEl.textContent = formatTime(getElapsed(state))

  const project = projs.find(p => p.id === state.projectId)

  // Show both project and description when available
  let displayText = ''
  if (project && state.description) {
    displayText = `${project.name} • ${state.description}`
  } else if (state.description) {
    displayText = state.description
  } else if (project) {
    displayText = project.name
  } else {
    displayText = 'No project'
  }

  projectEl.textContent = displayText
  projectEl.style.color = project ? project.color : 'rgba(165, 180, 252, 0.8)'

  if (state.status === 'running') {
    btnPause.className = 'action-btn btn-pause'
    btnPause.textContent = '⏸ Pause'
    btnPause.title = 'Pause'
  } else {
    btnPause.className = 'action-btn btn-resume'
    btnPause.textContent = '▶ Resume'
    btnPause.title = 'Resume'
  }

  widget.className = isMinimized ? 'mini' : 'full'
}

// Hides the widget DOM but keeps currentState/lastProjects (for tab re-activation)
function hideWidget(): void {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null }
  if (dragAbortController) { dragAbortController.abort(); dragAbortController = null }
  if (hostEl) { hostEl.remove(); hostEl = null; shadow = null }
}

// Fully removes widget and clears state (timer stopped or widget dismissed)
function removeWidget(): void {
  hideWidget()
  currentState = null
  lastProjects = []
}

// ---- Tick ----

function stopTick(): void {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null }
}

function startTick(): void {
  // Only tick when timer is actively running — avoid wasting CPU when paused
  if (tickInterval) return
  if (!currentState || currentState.status !== 'running') return
  tickInterval = setInterval(() => {
    if (!shadow || !currentState || currentState.status !== 'running') {
      stopTick()
      return
    }
    const timerEl = shadow.getElementById('timer')
    if (timerEl) timerEl.textContent = formatTime(getElapsed(currentState))
  }, 1000)
}

// ---- Show / hide based on tab visibility ----

// Called whenever this tab becomes the active, visible tab
function onTabVisible(): void {
  if (!currentState || currentState.status === 'idle') return
  if (isHidden || !autoShowEnabled) return
  if (!hostEl) buildWidget()
  updateWidget(currentState, lastProjects)
  startTick()
}

// Called whenever this tab goes to the background
function onTabHidden(): void {
  hideWidget() // remove DOM; keep currentState so we can restore on next visit
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    onTabVisible()
  } else {
    onTabHidden()
  }
})

// ---- Message Listener ----

chrome.runtime.onMessage.addListener((msg: ContentMessage) => {
  if (msg.action === 'RESTORE_TITLE') {
    document.title = msg.originalTitle
    return
  }

  if (msg.action === 'SHOW_FLOATING_TIMER') {
    const { state, projects: projs } = msg
    // User explicitly requested to show — clear hidden flag and reset position
    persistHidden(false)
    posX = 20
    posY = 20
    currentState = state
    lastProjects = projs
    if (state.status !== 'idle' && document.visibilityState === 'visible') {
      if (!hostEl) {
        buildWidget()
      } else {
        hostEl.setAttribute('style', buildHostStyle(20, 20))
      }
      updateWidget(state, projs)
      startTick()
    }
    return
  }

  if (msg.action === 'TIMER_SYNC') {
    const { state, projects: projs } = msg

    // Always cache state so tab-visibility restore works correctly
    lastProjects = projs
    if (state.status === 'idle') {
      removeWidget()
      return
    }
    currentState = state

    // Only show in the currently active (visible) tab
    if (document.visibilityState !== 'visible') return

    if (!hostEl && !isHidden && autoShowEnabled) {
      buildWidget()
    }
    if (hostEl) {
      updateWidget(state, projs)
      startTick()
    }
  }
})

// ---- Auth Bridge: relay auth tokens from website to background ----

// Allowed origins for auth messages — only accept from the companion website
const ALLOWED_AUTH_ORIGINS = [
  'https://w-timer.com',
  'https://www.w-timer.com',
]

// In development, also allow localhost
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  ALLOWED_AUTH_ORIGINS.push(location.origin)
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return

  // Lightweight ping — allowed from any origin (no sensitive data)
  if (event.data?.type === 'WORK_TIMER_PING') {
    window.postMessage({ type: 'WORK_TIMER_PONG' }, '*')
    return
  }

  // Auth messages — only accept from allowed origins
  if (event.data?.type === 'WORK_TIMER_AUTH') {
    if (!ALLOWED_AUTH_ORIGINS.includes(location.origin)) return

    chrome.runtime.sendMessage(
      {
        action: 'AUTH_LOGIN',
        accessToken: event.data.accessToken,
        refreshToken: event.data.refreshToken,
      },
      (response: { success?: boolean; error?: string }) => {
        window.postMessage({
          type: 'WORK_TIMER_AUTH_RESPONSE',
          success: response?.success ?? false,
          error: chrome.runtime.lastError?.message || response?.error,
        }, location.origin)
      }
    )
  }
})

// ---- Init: fetch current state on inject ----

async function init(): Promise<void> {
  await loadPersistedState()

  try {
    // Register with background so broadcasts target only tabs with a content script
    chrome.runtime.sendMessage({ action: 'CONTENT_SCRIPT_READY' }).catch(() => {})

    const response = await chrome.runtime.sendMessage({ action: 'GET_TIMER_STATE' })
    if (response?.success && response.state && response.state.status !== 'idle') {
      const projectsResult = await chrome.storage.local.get('projects')
      const projs: Project[] = (projectsResult['projects'] as Project[] | undefined) ?? []

      // Always cache state (even for background tabs) so visibilitychange can restore it
      currentState = response.state as TimerState
      lastProjects = projs

      // Only show immediately if this is the active tab
      if (!isHidden && autoShowEnabled && document.visibilityState === 'visible') {
        buildWidget()
        updateWidget(currentState, projs)
        startTick()
      }
    }
  } catch {
    // Extension context may not be available on some pages, ignore
  }
}

// Only run on regular web pages (not chrome://, about:, etc.)
if (document.documentElement.tagName === 'HTML') {
  init()
}
