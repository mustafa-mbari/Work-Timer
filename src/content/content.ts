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

const MINI_WIDTH = 68
const FULL_WIDTH = 200

let hostEl: HTMLElement | null = null
let shadow: ShadowRoot | null = null
let tickInterval: ReturnType<typeof setInterval> | null = null
let currentState: TimerState | null = null
let isMinimized = false
let isHidden = false       // user explicitly closed via ×; persisted
let autoShowEnabled = true // from settings; cached at init
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
  const s = result['settings'] as { floatingTimerAutoShow?: boolean } | undefined
  autoShowEnabled = s?.floatingTimerAutoShow !== false // default true
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
  hostEl.setAttribute('style', buildHostStyle(right, bottom))
}

// ---- Widget CSS ----

const STYLES = `
  :host {
    display: block !important;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    line-height: normal;
    -webkit-font-smoothing: antialiased;
  }

  #widget {
    background: #1e1b4b;
    border: 1px solid rgba(129, 140, 248, 0.3);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    color: #e0e7ff;
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

  #pulse.running { background: #6ee7b7; }
  #pulse.paused  { background: #fbbf24; animation: none; }

  @keyframes pulse {
    0%   { opacity: 1; }
    50%  { opacity: 0.35; }
    100% { opacity: 1; }
  }

  #timer {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #fff;
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
    color: rgba(224, 231, 255, 0.5);
    cursor: pointer;
    font-size: 11px;
    line-height: 1;
    padding: 0;
    flex-shrink: 0;
  }

  #close-btn:hover { background: rgba(248, 113, 113, 0.2); color: #f87171; }

  #body {
    padding: 0 10px 8px;
  }

  #project-name {
    font-size: 10px;
    color: rgba(165, 180, 252, 0.8);
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

  .btn-pause  { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
  .btn-resume { background: rgba(110, 231, 183, 0.2); color: #6ee7b7; }
  .btn-stop   { background: rgba(248, 113, 113, 0.2); color: #f87171; }

  /* Mini mode: compact pill — click anywhere on handle to expand */
  #widget.mini {
    border-radius: 20px;
  }

  .mini #drag-handle { padding: 10px 10px; }
  .mini #body { display: none; }
  .mini #timer { font-size: 11px; }
  .mini #close-btn { display: none; }
`

// ---- Build Widget DOM ----

function buildWidget(): void {
  hostEl = document.createElement('work-timer-widget')
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

  // Close button → hide widget (user dismissed it)
  shadow.getElementById('close-btn')!.addEventListener('click', (e) => {
    e.stopPropagation()
    persistHidden(true)
    removeWidget()
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
    const newBottom = Math.max(0, Math.min(window.innerHeight - 50, startBottom + dy))
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
  projectEl.textContent = state.description || project?.name || 'No project'
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

function removeWidget(): void {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null }
  if (hostEl) { hostEl.remove(); hostEl = null; shadow = null }
  currentState = null
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
    if (state.status !== 'idle') {
      if (!hostEl) {
        buildWidget()
      } else {
        // Reset position of existing widget to bottom-right
        hostEl.setAttribute('style', buildHostStyle(20, 20))
      }
      updateWidget(state, projs)
      startTick()
    }
    return
  }

  if (msg.action === 'TIMER_SYNC') {
    const { state, projects: projs } = msg

    if (state.status === 'idle') {
      removeWidget()
      return
    }

    // Build widget only if: not already visible, not hidden by user, and auto-show enabled
    if (!hostEl && !isHidden && autoShowEnabled) {
      buildWidget()
    }

    if (hostEl) {
      updateWidget(state, projs)
      startTick()
    }
  }
})

// ---- Init: fetch current state on inject ----

async function init(): Promise<void> {
  await loadPersistedState()

  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_TIMER_STATE' })
    if (response?.success && response.state && response.state.status !== 'idle') {
      if (!isHidden && autoShowEnabled) {
        const projectsResult = await chrome.storage.local.get('projects')
        const projs: Project[] = (projectsResult['projects'] as Project[] | undefined) ?? []
        buildWidget()
        updateWidget(response.state as TimerState, projs)
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
