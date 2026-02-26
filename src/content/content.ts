// Work Timer — Floating Mini Timer Content Script
// Runs on every page. Shows a draggable overlay widget when the timer is active.

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
let currentState: TimerState | null = null
let lastProjects: Project[] = []   // cached for visibility-change restores
let isMinimized = false
let isHidden = false       // user explicitly closed via ×; persisted
let autoShowEnabled = true // from settings; cached at init
let themeIsDark = true     // derived from extension theme setting
let posX = -1              // distance from right edge; -1 = auto (bottom-right)
let posY = -1

// ---- Time Formatting ----

function getElapsed(state: TimerState): number {
  if (state.status === 'running' && state.startTime) {
    return state.elapsed + (Date.now() - state.startTime)
  }
  return state.elapsed
}

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

// ---- Widget CSS ----

const STYLES = `
  /* --- Dark mode (default) --- */
  :host {
    display: block !important;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    line-height: normal;
    -webkit-font-smoothing: antialiased;

    --wt-bg:            #1e1b4b;
    --wt-border:        rgba(129, 140, 248, 0.3);
    --wt-shadow:        rgba(0, 0, 0, 0.4);
    --wt-text:          #e0e7ff;
    --wt-timer:         #ffffff;
    --wt-project:       rgba(165, 180, 252, 0.8);
    --wt-close:         rgba(224, 231, 255, 0.5);
    --wt-close-hbg:     rgba(248, 113, 113, 0.2);
    --wt-close-hfg:     #f87171;
    --wt-pulse-run:     #6ee7b7;
    --wt-pulse-pause:   #fbbf24;
    --wt-btn-pause-bg:  rgba(251, 191, 36, 0.2);
    --wt-btn-pause-fg:  #fbbf24;
    --wt-btn-resume-bg: rgba(110, 231, 183, 0.2);
    --wt-btn-resume-fg: #6ee7b7;
    --wt-btn-stop-bg:   rgba(248, 113, 113, 0.2);
    --wt-btn-stop-fg:   #f87171;
  }

  /* --- Light mode override (when extension theme is a light-* variant) --- */
  :host([data-scheme="light"]) {
    --wt-bg:            #ffffff;
    --wt-border:        rgba(99, 102, 241, 0.25);
    --wt-shadow:        rgba(99, 102, 241, 0.15);
    --wt-text:          #312e81;
    --wt-timer:         #1e1b4b;
    --wt-project:       #6366f1;
    --wt-close:         rgba(67, 56, 202, 0.45);
    --wt-close-hbg:     rgba(239, 68, 68, 0.12);
    --wt-close-hfg:     #dc2626;
    --wt-pulse-run:     #059669;
    --wt-pulse-pause:   #d97706;
    --wt-btn-pause-bg:  rgba(217, 119, 6, 0.12);
    --wt-btn-pause-fg:  #b45309;
    --wt-btn-resume-bg: rgba(5, 150, 105, 0.12);
    --wt-btn-resume-fg: #047857;
    --wt-btn-stop-bg:   rgba(239, 68, 68, 0.12);
    --wt-btn-stop-fg:   #dc2626;
  }

  #widget {
    background: var(--wt-bg);
    border: 1px solid var(--wt-border);
    border-radius: 12px;
    box-shadow: 0 8px 24px var(--wt-shadow);
    color: var(--wt-text);
    cursor: default;
    user-select: none;
    overflow: hidden;
    transition: border-radius 0.15s ease;
  }

  #drag-handle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 10px 4px;
    cursor: pointer;
  }

  #drag-handle:active { cursor: grabbing; }

  #pulse {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    animation: pulse 1.5s infinite;
  }

  #pulse.running { background: var(--wt-pulse-run); }
  #pulse.paused  { background: var(--wt-pulse-pause); animation: none; }

  @keyframes pulse {
    0%   { opacity: 1; }
    50%  { opacity: 0.35; }
    100% { opacity: 1; }
  }

  #timer {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--wt-timer);
    flex: 1;
    font-variant-numeric: tabular-nums;
  }

  #close-btn {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--wt-close);
    cursor: pointer;
    font-size: 11px;
    line-height: 1;
    padding: 0;
    flex-shrink: 0;
  }

  #close-btn:hover { background: var(--wt-close-hbg); color: var(--wt-close-hfg); }

  #body {
    padding: 0 10px 8px;
  }

  #project-name {
    font-size: 10px;
    color: var(--wt-project);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    margin-bottom: 6px;
  }

  #actions {
    display: flex;
    gap: 4px;
  }

  .action-btn {
    flex: 1;
    border: none;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    padding: 4px 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    transition: opacity 0.1s;
  }

  .action-btn:hover { opacity: 0.85; }
  .action-btn:active { transform: scale(0.96); }

  .btn-pause  { background: var(--wt-btn-pause-bg);  color: var(--wt-btn-pause-fg); }
  .btn-resume { background: var(--wt-btn-resume-bg); color: var(--wt-btn-resume-fg); }
  .btn-stop   { background: var(--wt-btn-stop-bg);   color: var(--wt-btn-stop-fg); }

  /* Mini mode: compact pill — click anywhere on handle to expand */
  #widget.mini {
    border-radius: 20px;
  }

  .mini #drag-handle { padding: 10px 12px; }
  .mini #body { display: none; }
  .mini #timer { font-size: 12px; }
  .mini #close-btn { display: none; }
`

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
  })

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !hostEl) return
    const dx = startMouseX - e.clientX
    const dy = startMouseY - e.clientY
    const widgetWidth = isMinimized ? MINI_WIDTH : FULL_WIDTH
    const newRight = Math.max(0, Math.min(window.innerWidth - widgetWidth, startRight + dx))
    const widgetHeight = isMinimized ? MINI_HEIGHT : FULL_HEIGHT
    const newBottom = Math.max(0, Math.min(window.innerHeight - widgetHeight, startBottom + dy))
    hostEl.setAttribute('style', buildHostStyle(newRight, newBottom))
  })

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false
      savePosition()
    }
  })
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
  if (hostEl) { hostEl.remove(); hostEl = null; shadow = null }
}

// Fully removes widget and clears state (timer stopped or widget dismissed)
function removeWidget(): void {
  hideWidget()
  currentState = null
  lastProjects = []
}

// ---- Tick ----

function startTick(): void {
  if (tickInterval) return
  tickInterval = setInterval(() => {
    if (!shadow || !currentState) return
    if (currentState.status === 'running') {
      const timerEl = shadow.getElementById('timer')
      if (timerEl) timerEl.textContent = formatTime(getElapsed(currentState))
    }
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

window.addEventListener('message', (event) => {
  if (event.source !== window) return

  // Lightweight ping — just confirms the extension is installed and running
  if (event.data?.type === 'WORK_TIMER_PING') {
    window.postMessage({ type: 'WORK_TIMER_PONG' }, '*')
    return
  }

  if (event.data?.type === 'WORK_TIMER_AUTH') {
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
        }, '*')
      }
    )
  }
})

// ---- Init: fetch current state on inject ----

async function init(): Promise<void> {
  await loadPersistedState()

  try {
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
