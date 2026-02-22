import { useState, useEffect } from 'react'
import type { Settings, SyncDiagnostics } from '@/types'
import { getSettings, updateSettings } from '@/storage'
import { useProjects, ProjectLimitError } from '@/hooks/useProjects'
import { useTags } from '@/hooks/useTags'
import { useTheme, THEMES } from '@/hooks/useTheme'
import { MonitorIcon, PlusIcon, XIcon, PencilIcon, DotsIcon, DragHandleIcon, StarIcon } from './Icons'
import { PROJECT_COLORS } from '@/constants/colors'
import { inputClass, labelClass } from '@/constants/styles'
import ConfirmDialog from './ConfirmDialog'
import UpgradePrompt from './UpgradePrompt'
import { useAuth } from '@/hooks/useAuth'
import { usePremium } from '@/hooks/usePremium'
import { WEBSITE_URL, PRICING, ENTRY_SAVE_TIME } from '@shared/constants'

type SettingsTab = 'general' | 'timer' | 'data' | 'account'

export default function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const { activeProjects, projects, create, update, archive, remove, setDefault, reorder } = useProjects()
  const { tags, activeTags, create: createTag, update: updateTag, remove: removeTag, archive: archiveTag, setDefault: setDefaultTag, reorder: reorderTags } = useTags()
  const { theme, setTheme } = useTheme()
  const { session, loading: authLoading, signIn, signOut } = useAuth()
  const { isPremium, subscription } = usePremium()

  const [tab, setTab] = useState<SettingsTab>('general')
  const [showUpgradeForProject, setShowUpgradeForProject] = useState(false)

  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0])
  const [showArchived, setShowArchived] = useState(false)
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; color: string } | null>(null)

  const [newTagName, setNewTagName] = useState('')
  const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null)

  const [confirmArchive, setConfirmArchive] = useState<{ id: string; name: string } | null>(null)
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<{ id: string; name: string } | null>(null)
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<{ id: string; name: string } | null>(null)
  const [confirmArchiveTag, setConfirmArchiveTag] = useState<{ id: string; name: string } | null>(null)
  const [showArchivedTags, setShowArchivedTags] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [openTagMenuId, setOpenTagMenuId] = useState<string | null>(null)
  const [colorPickerProjectId, setColorPickerProjectId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [draggingTagId, setDraggingTagId] = useState<string | null>(null)
  const [dragOverTagId, setDragOverTagId] = useState<string | null>(null)

  const [syncing, setSyncing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [diagnosing, setDiagnosing] = useState(false)
  const [diagnostics, setDiagnostics] = useState<SyncDiagnostics | null>(null)
  const [clearingLocal, setClearingLocal] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  // Load last sync time when on account tab
  useEffect(() => {
    if (tab !== 'account' || !isPremium) return
    chrome.runtime.sendMessage({ action: 'SYNC_STATUS' }, (res) => {
      if (res?.syncState?.lastSyncAt) setLastSyncAt(res.syncState.lastSyncAt)
    })
  }, [tab, isPremium])

  const handleSyncNow = async () => {
    setSyncing(true)
    chrome.runtime.sendMessage({ action: 'SYNC_NOW' }, () => {
      // Re-fetch status after a short delay to let sync complete
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'SYNC_STATUS' }, (res) => {
          if (res?.syncState?.lastSyncAt) setLastSyncAt(res.syncState.lastSyncAt)
          setSyncing(false)
        })
      }, 3000)
    })
  }

  const handleReuploadAll = () => {
    setUploading(true)
    setUploadMsg(null)
    chrome.runtime.sendMessage({ action: 'UPLOAD_ALL' }, (res) => {
      if (res?.success) {
        setUploadMsg('All data re-uploaded successfully')
        chrome.runtime.sendMessage({ action: 'SYNC_STATUS' }, (s) => {
          if (s?.syncState?.lastSyncAt) setLastSyncAt(s.syncState.lastSyncAt)
        })
      } else {
        setUploadMsg(res?.error || 'Upload failed')
      }
      setUploading(false)
    })
  }

  const handleDiagnose = () => {
    setDiagnosing(true)
    chrome.runtime.sendMessage({ action: 'DIAGNOSE_SYNC' }, (res) => {
      if (res?.syncDiagnostics) setDiagnostics(res.syncDiagnostics)
      setDiagnosing(false)
    })
  }

  const handleClearAndResync = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    setClearingLocal(true)
    setConfirmClear(false)
    setDiagnostics(null)
    chrome.runtime.sendMessage({ action: 'CLEAR_AND_RESYNC' }, () => {
      setClearingLocal(false)
      setUploadMsg('Local data cleared. Pulling fresh data from cloud…')
      setTimeout(() => setUploadMsg(null), 4000)
    })
  }

  useEffect(() => {
    if (!openMenuId) return
    const close = () => setOpenMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenuId])

  useEffect(() => {
    if (!openTagMenuId) return
    const close = () => setOpenTagMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openTagMenuId])

  const handleSettingChange = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!settings) return
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    await updateSettings({ [key]: value })
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    try {
      await create(newProjectName.trim(), newProjectColor)
      setNewProjectName('')
      setNewProjectColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)])
    } catch (err) {
      if (err instanceof ProjectLimitError) {
        setShowUpgradeForProject(true)
      }
    }
  }

  const handleSaveProject = async () => {
    if (!editingProject || !editingProject.name.trim()) return
    const project = projects.find(p => p.id === editingProject.id)
    if (!project) return
    await update({ ...project, name: editingProject.name.trim() })
    setEditingProject(null)
  }

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return
    const ids = activeProjects.map(p => p.id)
    const fromIdx = ids.indexOf(draggingId)
    const toIdx = ids.indexOf(targetId)
    const reordered = [...ids]
    reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, draggingId)
    void reorder(reordered)
    setDragOverId(null)
    setDraggingId(null)
  }

  const handleTagDrop = (targetId: string) => {
    if (!draggingTagId || draggingTagId === targetId) return
    const ids = activeTags.map(t => t.id)
    const fromIdx = ids.indexOf(draggingTagId)
    const toIdx = ids.indexOf(targetId)
    const reordered = [...ids]
    reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, draggingTagId)
    void reorderTags(reordered)
    setDragOverTagId(null)
    setDraggingTagId(null)
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    await createTag(newTagName.trim())
    setNewTagName('')
  }

  const handleSaveTag = async () => {
    if (!editingTag || !editingTag.name.trim()) return
    await updateTag({ id: editingTag.id, name: editingTag.name.trim() })
    setEditingTag(null)
  }

  if (!settings) return null

  const archivedProjects = projects.filter(p => p.archived)
  const archivedTags = tags.filter(t => t.archived)

  const toggleButton = (isActive: boolean) =>
    `flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
      isActive
        ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm shadow-indigo-500/20'
        : 'border-stone-200 dark:border-dark-border text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-dark-hover'
    }`

  return (
    <div className="flex flex-col">
      {/* Header + Tab Bar — sticky within parent scroll */}
      <div className="sticky top-0 z-10 bg-stone-50 dark:bg-dark px-5 py-3 border-b border-stone-100 dark:border-dark-border">
        <div className="flex gap-1 bg-stone-100 dark:bg-dark-card rounded-xl p-1">
          {(['general', 'timer', 'data', 'account'] as SettingsTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-all capitalize ${
                tab === t
                  ? 'bg-white dark:bg-dark-elevated text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-5 py-4 flex flex-col gap-5">

        {/* ── GENERAL TAB ── */}
        {tab === 'general' && (
          <>
            {/* Theme */}
            <div>
              <label className={labelClass}>Theme</label>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-1.5">Light</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {THEMES.filter(t => !t.isDark).map(({ id, label, swatchBg, swatchAccent }) => {
                  const isActive = theme === id
                  return (
                    <button
                      key={id}
                      onClick={() => setTheme(id)}
                      aria-label={`Set theme to ${label}`}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 transition-all ${
                        isActive
                          ? 'border-indigo-500 dark:border-indigo-400 shadow-sm shadow-indigo-500/20'
                          : 'border-stone-200 dark:border-dark-border hover:border-stone-300 dark:hover:border-dark-hover'
                      }`}
                    >
                      <span className="w-8 h-8 rounded-full border border-black/10 relative flex items-center justify-center" style={{ backgroundColor: swatchBg }}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: swatchAccent }} />
                      </span>
                      <span className="text-[11px] font-medium text-stone-600 dark:text-stone-300">{label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-1.5">Dark</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {THEMES.filter(t => t.isDark).map(({ id, label, swatchBg, swatchAccent }) => {
                  const isActive = theme === id
                  return (
                    <button
                      key={id}
                      onClick={() => setTheme(id)}
                      aria-label={`Set theme to ${label}`}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 transition-all ${
                        isActive
                          ? 'border-indigo-500 dark:border-indigo-400 shadow-sm shadow-indigo-500/20'
                          : 'border-stone-200 dark:border-dark-border hover:border-stone-300 dark:hover:border-dark-hover'
                      }`}
                    >
                      <span className="w-8 h-8 rounded-full border border-white/10 relative flex items-center justify-center" style={{ backgroundColor: swatchBg }}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: swatchAccent }} />
                      </span>
                      <span className="text-[11px] font-medium text-stone-600 dark:text-stone-300">{label}</span>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setTheme('system')}
                aria-label="Set theme to system"
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 transition-all text-sm font-medium ${
                  theme === 'system'
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 shadow-sm shadow-indigo-500/20'
                    : 'border-stone-200 dark:border-dark-border text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-dark-hover'
                }`}
              >
                <MonitorIcon className="w-3.5 h-3.5" />
                System (follows OS)
              </button>
            </div>

            {/* Working Days */}
            <div>
              <label className={labelClass}>Working Days</label>
              <div className="flex gap-1.5">
                {[5, 6, 7].map((d) => (
                  <button key={d} onClick={() => handleSettingChange('workingDays', d)} className={toggleButton(settings.workingDays === d)}>
                    {d} days
                  </button>
                ))}
              </div>
            </div>

            {/* Week Start Day */}
            <div>
              <label className={labelClass}>Week Starts On</label>
              <div className="flex gap-1.5">
                {([1, 0] as const).map((d) => (
                  <button key={d} onClick={() => handleSettingChange('weekStartDay', d)} className={toggleButton(settings.weekStartDay === d)}>
                    {d === 1 ? 'Monday' : 'Sunday'}
                  </button>
                ))}
              </div>
            </div>

            {/* Daily & Weekly Targets */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Daily Target (h)</label>
                <input
                  type="number" min="0" max="24" step="0.5"
                  value={settings.dailyTarget ?? ''}
                  onChange={(e) => handleSettingChange('dailyTarget', e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                  aria-label="Daily target hours"
                />
              </div>
              <div>
                <label className={labelClass}>Weekly Target (h)</label>
                <input
                  type="number" min="0" max="168" step="1"
                  value={settings.weeklyTarget ?? ''}
                  onChange={(e) => handleSettingChange('weeklyTarget', e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                  aria-label="Weekly target hours"
                />
              </div>
            </div>

            {/* Floating Widget */}
            <div>
              <label className={labelClass}>Floating Widget</label>
              <label className="flex items-center justify-between py-2.5 px-3 rounded-xl border border-stone-100 dark:border-dark-border bg-white dark:bg-dark-card cursor-pointer">
                <span className="text-sm text-stone-700 dark:text-stone-200">Auto-show when timer starts</span>
                <div
                  role="switch"
                  aria-checked={settings.floatingTimerAutoShow}
                  onClick={() => handleSettingChange('floatingTimerAutoShow', !settings.floatingTimerAutoShow)}
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${settings.floatingTimerAutoShow ? 'bg-indigo-500' : 'bg-stone-200 dark:bg-dark-elevated'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.floatingTimerAutoShow ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </label>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1.5 px-1">
                When disabled, use right-click on the extension icon → "Show Floating Widget" to display it manually.
              </p>
            </div>

            {/* Version */}
            <div className="text-center text-[10px] text-stone-300 dark:text-stone-600 pt-1">
              Work Timer v1.0.0
            </div>
          </>
        )}

        {/* ── TIMER TAB ── */}
        {tab === 'timer' && (
          <>
            {/* Idle Detection */}
            <div>
              <label className={labelClass}>Idle Detection (minutes)</label>
              <input
                type="number" min="1" max="60"
                value={settings.idleTimeout}
                onChange={(e) => handleSettingChange('idleTimeout', Number(e.target.value))}
                className={inputClass}
                aria-label="Idle detection timeout in minutes"
              />
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1.5 px-1">
                Prompt to discard idle time after this many minutes of inactivity.
              </p>
            </div>

            {/* Minimum Entry Duration */}
            <div>
              <label className={labelClass}>Minimum Entry Duration</label>
              <select
                value={settings.entrySaveTime}
                onChange={(e) => handleSettingChange('entrySaveTime', Number(e.target.value))}
                className={inputClass}
                aria-label="Minimum entry duration"
              >
                {ENTRY_SAVE_TIME.options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1.5 px-1">
                Entries shorter than this are automatically discarded.
              </p>
            </div>

            {/* Pomodoro */}
            <div>
              <label className={labelClass}>Pomodoro</label>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-stone-400 dark:text-stone-500 block mb-1">Work (min)</label>
                  <input type="number" min="1" max="120" value={settings.pomodoro.workMinutes}
                    onChange={(e) => handleSettingChange('pomodoro', { ...settings.pomodoro, workMinutes: Number(e.target.value) })}
                    className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 dark:text-stone-500 block mb-1">Short Break (min)</label>
                  <input type="number" min="1" max="30" value={settings.pomodoro.shortBreakMinutes}
                    onChange={(e) => handleSettingChange('pomodoro', { ...settings.pomodoro, shortBreakMinutes: Number(e.target.value) })}
                    className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 dark:text-stone-500 block mb-1">Long Break (min)</label>
                  <input type="number" min="1" max="60" value={settings.pomodoro.longBreakMinutes}
                    onChange={(e) => handleSettingChange('pomodoro', { ...settings.pomodoro, longBreakMinutes: Number(e.target.value) })}
                    className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 dark:text-stone-500 block mb-1">Sessions before long</label>
                  <input type="number" min="1" max="10" value={settings.pomodoro.sessionsBeforeLongBreak}
                    onChange={(e) => handleSettingChange('pomodoro', { ...settings.pomodoro, sessionsBeforeLongBreak: Number(e.target.value) })}
                    className={inputClass} />
                </div>
              </div>
              <label className="flex items-center gap-2 mt-3 text-xs text-stone-600 dark:text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pomodoro.soundEnabled}
                  onChange={(e) => handleSettingChange('pomodoro', { ...settings.pomodoro, soundEnabled: e.target.checked })}
                  className="rounded border-stone-300 dark:border-dark-border text-indigo-500 focus:ring-indigo-500/40"
                />
                Sound notifications
              </label>
            </div>

            {/* Weekly Reminder */}
            <div>
              <label className={labelClass}>Weekly Reminder</label>
              <div className="rounded-xl border border-stone-100 dark:border-dark-border px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-stone-700 dark:text-stone-300">Export reminder</p>
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
                      Remind to export/review work records
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.reminder?.enabled ?? true}
                    onClick={() => handleSettingChange('reminder', {
                      ...(settings.reminder ?? { enabled: true, dayOfWeek: 5, hour: 14, minute: 0 }),
                      enabled: !(settings.reminder?.enabled ?? true),
                    })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      (settings.reminder?.enabled ?? true) ? 'bg-indigo-500' : 'bg-stone-300 dark:bg-dark-border'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      (settings.reminder?.enabled ?? true) ? 'translate-x-[18px]' : 'translate-x-[3px]'
                    }`} />
                  </button>
                </div>

                {(settings.reminder?.enabled ?? true) && (
                  <div className="mt-3 pt-3 border-t border-stone-100 dark:border-dark-border space-y-2.5">
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] text-stone-500 dark:text-stone-400 w-10 shrink-0">Day</label>
                      <select
                        value={settings.reminder?.dayOfWeek ?? 5}
                        onChange={e => handleSettingChange('reminder', {
                          ...(settings.reminder ?? { enabled: true, dayOfWeek: 5, hour: 14, minute: 0 }),
                          dayOfWeek: Number(e.target.value),
                        })}
                        className={inputClass}
                        disabled={!isPremium}
                      >
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                          .map((name, i) => <option key={i} value={i}>{name}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] text-stone-500 dark:text-stone-400 w-10 shrink-0">Time</label>
                      <input
                        type="time"
                        value={`${String(settings.reminder?.hour ?? 14).padStart(2, '0')}:${String(settings.reminder?.minute ?? 0).padStart(2, '0')}`}
                        onChange={e => {
                          const [h, m] = e.target.value.split(':').map(Number)
                          handleSettingChange('reminder', {
                            ...(settings.reminder ?? { enabled: true, dayOfWeek: 5, hour: 14, minute: 0 }),
                            hour: h,
                            minute: m,
                          })
                        }}
                        className={inputClass}
                        disabled={!isPremium}
                      />
                    </div>
                    {!isPremium && (
                      <p className="text-[10px] text-stone-400 dark:text-stone-500">
                        Upgrade to Premium to customize the reminder day and time.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div>
              <label className={labelClass}>Keyboard Shortcuts</label>
              <div className="flex flex-col gap-1.5 text-xs">
                {[
                  { action: 'Open Popup', shortcut: 'Alt+Shift+O' },
                  { action: 'Start/Stop Timer', shortcut: 'Alt+Shift+↑' },
                  { action: 'Pause/Resume Timer', shortcut: 'Alt+Shift+↓' },
                ].map(({ action, shortcut }) => (
                  <div key={action} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-stone-50 dark:bg-dark-card">
                    <span className="text-stone-600 dark:text-stone-300">{action}</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-dark-elevated border border-stone-200 dark:border-dark-border text-stone-600 dark:text-stone-300 font-mono text-[10px] font-medium">
                      {shortcut}
                    </kbd>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-2">
                Shortcuts work globally in Chrome, even when the popup is closed.
              </p>
            </div>
          </>
        )}

        {/* ── DATA TAB ── */}
        {tab === 'data' && (
          <>
            {/* Projects */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label className={labelClass + ' mb-0'}>Projects</label>
                {archivedProjects.length > 0 && (
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                  >
                    {showArchived ? 'Hide archived' : `Show archived (${archivedProjects.length})`}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5 mb-3">
                {activeProjects.map((project) => (
                  editingProject?.id === project.id ? (
                    <div key={project.id} className="flex flex-col gap-2 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-700/40 bg-white dark:bg-dark-card">
                      <input
                        type="text"
                        value={editingProject.name}
                        onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveProject()}
                        className={inputClass}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveProject} disabled={!editingProject.name.trim()}
                          className="flex-1 bg-indigo-500 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-600 disabled:opacity-40 transition-colors">
                          Save
                        </button>
                        <button onClick={() => setEditingProject(null)}
                          className="flex-1 border border-stone-200 dark:border-dark-border py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={project.id}
                      draggable
                      onDragStart={() => setDraggingId(project.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverId(null) }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverId(project.id) }}
                      onDrop={() => handleDrop(project.id)}
                      className={`flex flex-col rounded-xl border bg-white dark:bg-dark-card transition-colors ${
                        dragOverId === project.id
                          ? 'border-indigo-400 dark:border-indigo-500'
                          : 'border-stone-100 dark:border-dark-border'
                      } ${draggingId === project.id ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-2 p-2.5">
                        <span
                          className="text-stone-300 dark:text-stone-600 cursor-grab active:cursor-grabbing flex-shrink-0"
                          aria-hidden="true"
                        >
                          <DragHandleIcon className="w-3.5 h-3.5" />
                        </span>
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} aria-hidden="true" />
                        <span className="text-sm text-stone-700 dark:text-stone-200 flex-1 min-w-0 truncate">{project.name}</span>
                        {project.isDefault && (
                          <span className="text-amber-400 dark:text-amber-300 flex-shrink-0" aria-label="Default project">
                            <StarIcon className="w-3 h-3" filled />
                          </span>
                        )}
                        <button
                          onClick={() => setEditingProject({ id: project.id, name: project.name, color: project.color })}
                          className="text-stone-400 dark:text-stone-500 hover:text-indigo-500 dark:hover:text-indigo-400 p-1 rounded transition-colors flex-shrink-0"
                          aria-label={`Edit ${project.name}`}
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === project.id ? null : project.id) }}
                            className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 p-1 rounded transition-colors"
                            aria-label={`More options for ${project.name}`}
                          >
                            <DotsIcon className="w-3.5 h-3.5" />
                          </button>
                          {openMenuId === project.id && (
                            <div
                              className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-dark-elevated rounded-xl shadow-lg border border-stone-200 dark:border-dark-border py-1 min-w-[148px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => { void setDefault(project.id); setOpenMenuId(null) }}
                                className="w-full text-left px-3 py-2 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors flex items-center gap-2"
                              >
                                <StarIcon className="w-3 h-3" filled={!!project.isDefault} />
                                {project.isDefault ? 'Remove Default' : 'Set as Default'}
                              </button>
                              <button
                                onClick={() => { setColorPickerProjectId(colorPickerProjectId === project.id ? null : project.id); setOpenMenuId(null) }}
                                className="w-full text-left px-3 py-2 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors"
                              >
                                Change Color
                              </button>
                              <button
                                onClick={() => { setConfirmArchive({ id: project.id, name: project.name }); setOpenMenuId(null) }}
                                className="w-full text-left px-3 py-2 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors"
                              >
                                Archive
                              </button>
                              <div className="border-t border-stone-100 dark:border-dark-border my-1" />
                              <button
                                onClick={() => { setConfirmDeleteProject({ id: project.id, name: project.name }); setOpenMenuId(null) }}
                                className="w-full text-left px-3 py-2 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {colorPickerProjectId === project.id && (
                        <div className="flex gap-1.5 flex-wrap px-3 pb-2.5">
                          {PROJECT_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => { void update({ ...project, color }); setColorPickerProjectId(null) }}
                              className={`w-5 h-5 rounded-full border-2 transition-all ${project.color === color ? 'border-stone-800 dark:border-stone-200 scale-110' : 'border-transparent'}`}
                              style={{ backgroundColor: color }}
                              aria-label={`Select color ${color}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ))}

                {activeProjects.length === 0 && (
                  <div className="text-xs text-stone-400 dark:text-stone-600 text-center py-3">No projects yet</div>
                )}

                {showArchived && archivedProjects.map((project) => (
                  <div key={project.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-stone-100 dark:border-dark-border bg-stone-50 dark:bg-dark-card opacity-60">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} aria-hidden="true" />
                    <span className="text-sm text-stone-400 dark:text-stone-500 flex-1 line-through">{project.name}</span>
                    <button
                      onClick={() => update({ ...project, archived: false })}
                      className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 px-1.5 py-0.5 rounded"
                      aria-label={`Restore ${project.name}`}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>

              {/* New Project */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="New project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                    className={`${inputClass} dark:placeholder-stone-600`}
                    aria-label="New project name"
                  />
                </div>
                <div className="flex gap-1">
                  {PROJECT_COLORS.slice(0, 5).map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewProjectColor(color)}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${newProjectColor === color ? 'border-stone-800 dark:border-stone-200 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="bg-indigo-500 text-white p-2 rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-colors shadow-sm shadow-indigo-500/20"
                  aria-label="Add project"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-stone-100 dark:border-dark-border" />

            {/* Tags */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label className={labelClass + ' mb-0'}>Tags</label>
                {archivedTags.length > 0 && (
                  <button
                    onClick={() => setShowArchivedTags(!showArchivedTags)}
                    className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                  >
                    {showArchivedTags ? 'Hide archived' : `Show archived (${archivedTags.length})`}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5 mb-3">
                {activeTags.map((tag) => (
                  editingTag?.id === tag.id ? (
                    <div key={tag.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-700/40 bg-white dark:bg-dark-card">
                      <input
                        type="text"
                        value={editingTag.name}
                        onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTag()}
                        className={`${inputClass} flex-1`}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveTag}
                        disabled={!editingTag.name.trim()}
                        className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 px-2 py-1 rounded disabled:opacity-40 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTag(null)}
                        className="p-1 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                        aria-label="Cancel"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      key={tag.id}
                      draggable
                      onDragStart={() => setDraggingTagId(tag.id)}
                      onDragEnd={() => { setDraggingTagId(null); setDragOverTagId(null) }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverTagId(tag.id) }}
                      onDrop={() => handleTagDrop(tag.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border bg-white dark:bg-dark-card transition-colors ${
                        dragOverTagId === tag.id
                          ? 'border-indigo-400 dark:border-indigo-500'
                          : 'border-stone-100 dark:border-dark-border'
                      } ${draggingTagId === tag.id ? 'opacity-50' : ''}`}
                    >
                      <span
                        className="text-stone-300 dark:text-stone-600 cursor-grab active:cursor-grabbing flex-shrink-0"
                        aria-hidden="true"
                      >
                        <DragHandleIcon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-sm text-stone-700 dark:text-stone-200 flex-1 min-w-0 truncate">{tag.name}</span>
                      {tag.isDefault && (
                        <span className="text-amber-400 dark:text-amber-300 flex-shrink-0" aria-label="Default tag">
                          <StarIcon className="w-3 h-3" filled />
                        </span>
                      )}
                      <button
                        onClick={() => setEditingTag({ id: tag.id, name: tag.name })}
                        className="text-stone-400 dark:text-stone-500 hover:text-indigo-500 dark:hover:text-indigo-400 p-1 rounded transition-colors flex-shrink-0"
                        aria-label={`Edit ${tag.name}`}
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenTagMenuId(openTagMenuId === tag.id ? null : tag.id) }}
                          className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 p-1 rounded transition-colors"
                          aria-label={`More options for ${tag.name}`}
                        >
                          <DotsIcon className="w-3.5 h-3.5" />
                        </button>
                        {openTagMenuId === tag.id && (
                          <div
                            className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-dark-elevated rounded-xl shadow-lg border border-stone-200 dark:border-dark-border py-1 min-w-[148px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { void setDefaultTag(tag.id); setOpenTagMenuId(null) }}
                              className="w-full text-left px-3 py-2 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors flex items-center gap-2"
                            >
                              <StarIcon className="w-3 h-3" filled={!!tag.isDefault} />
                              {tag.isDefault ? 'Remove Default' : 'Set as Default'}
                            </button>
                            <button
                              onClick={() => { setConfirmArchiveTag({ id: tag.id, name: tag.name }); setOpenTagMenuId(null) }}
                              className="w-full text-left px-3 py-2 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors"
                            >
                              Archive
                            </button>
                            <div className="border-t border-stone-100 dark:border-dark-border my-1" />
                            <button
                              onClick={() => { setConfirmDeleteTag({ id: tag.id, name: tag.name }); setOpenTagMenuId(null) }}
                              className="w-full text-left px-3 py-2 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ))}

                {activeTags.length === 0 && (
                  <div className="text-xs text-stone-400 dark:text-stone-600 text-center py-3">No tags yet</div>
                )}

                {showArchivedTags && archivedTags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-stone-100 dark:border-dark-border bg-stone-50 dark:bg-dark-card opacity-60">
                    <span className="text-sm text-stone-400 dark:text-stone-500 flex-1 line-through">{tag.name}</span>
                    <button
                      onClick={() => void updateTag({ ...tag, archived: false })}
                      className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 px-1.5 py-0.5 rounded"
                      aria-label={`Restore ${tag.name}`}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="New tag name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                    className={`${inputClass} dark:placeholder-stone-600`}
                    aria-label="New tag name"
                  />
                </div>
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="bg-indigo-500 text-white p-2 rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-colors shadow-sm shadow-indigo-500/20"
                  aria-label="Add tag"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── ACCOUNT TAB ── */}
        {tab === 'account' && (
          <>
            {authLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : session ? (
              <>
                {/* User info */}
                <div className="bg-white dark:bg-dark-card rounded-xl border border-stone-100 dark:border-dark-border p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {session.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">{session.email}</p>
                    <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
                      {isPremium ? 'Premium' : 'Free plan'}
                    </p>
                  </div>
                  {isPremium && (
                    <span className="text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                      PRO
                    </span>
                  )}
                </div>

                {/* Plan details */}
                {!isPremium && (
                  <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-4 flex flex-col gap-3">
                    <div>
                      <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Upgrade to Premium</p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                        Unlimited projects, full history, export, cloud sync & advanced analytics.
                      </p>
                    </div>
                    <button
                      onClick={() => chrome.tabs.create({ url: `${WEBSITE_URL}/billing` })}
                      className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
                    >
                      Upgrade — ${PRICING.monthly}/mo
                    </button>
                  </div>
                )}

                {subscription && isPremium && (
                  <div className="rounded-xl border border-stone-100 dark:border-dark-border p-4">
                    <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
                      {subscription.plan === 'premium_monthly' ? 'Monthly plan' : 'Yearly plan'}
                      {subscription.cancelAtPeriodEnd && ' · cancels at period end'}
                    </p>
                    {subscription.currentPeriodEnd && (
                      <p className="text-xs text-stone-400 dark:text-stone-500">
                        Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    )}
                    <button
                      onClick={() => chrome.tabs.create({ url: `${WEBSITE_URL}/billing` })}
                      className="mt-3 text-xs text-indigo-500 dark:text-indigo-400 hover:underline"
                    >
                      Manage billing
                    </button>
                  </div>
                )}

                {/* Open Dashboard */}
                <button
                  onClick={() => chrome.tabs.create({ url: `${WEBSITE_URL}/dashboard` })}
                  className="w-full border border-stone-200 dark:border-dark-border text-stone-700 dark:text-stone-200 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                  Open Dashboard
                </button>

                {/* Cloud Sync */}
                {isPremium && (
                  <div className="rounded-xl border border-stone-100 dark:border-dark-border px-4 py-3 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-stone-700 dark:text-stone-300">Cloud sync</p>
                      {lastSyncAt ? (
                        <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
                          Last synced {new Date(lastSyncAt).toLocaleTimeString()}
                        </p>
                      ) : (
                        <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">Not synced yet</p>
                      )}
                    </div>

                    {/* Sync now */}
                    <button
                      onClick={handleSyncNow}
                      disabled={syncing || uploading}
                      className="w-full border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 py-2 rounded-lg text-xs font-medium hover:bg-indigo-50 dark:hover:bg-indigo-500/10 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      {syncing && <span className="w-3 h-3 border border-indigo-500 border-t-transparent rounded-full animate-spin" />}
                      {syncing ? 'Syncing…' : 'Sync now'}
                    </button>

                    {/* Re-upload all */}
                    <button
                      onClick={handleReuploadAll}
                      disabled={uploading || syncing}
                      className="w-full border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 py-2 rounded-lg text-xs font-medium hover:bg-amber-50 dark:hover:bg-amber-500/10 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      {uploading && <span className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin" />}
                      {uploading ? 'Uploading…' : 'Re-upload all data'}
                    </button>

                    {uploadMsg && (
                      <p className={`text-[11px] ${uploadMsg.includes('fail') ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {uploadMsg}
                      </p>
                    )}

                    {/* Sync diagnostics */}
                    <button
                      onClick={handleDiagnose}
                      disabled={diagnosing || syncing || uploading || clearingLocal}
                      className="w-full border border-stone-200 dark:border-dark-border text-stone-500 dark:text-stone-400 py-2 rounded-lg text-xs font-medium hover:bg-stone-50 dark:hover:bg-dark-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      {diagnosing && <span className="w-3 h-3 border border-stone-400 border-t-transparent rounded-full animate-spin" />}
                      {diagnosing ? 'Checking…' : 'Check sync status'}
                    </button>

                    {/* Drop local data & sync fresh */}
                    <button
                      onClick={handleClearAndResync}
                      onBlur={() => setConfirmClear(false)}
                      disabled={clearingLocal || syncing || uploading || diagnosing}
                      className={`w-full border py-2 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 ${
                        confirmClear
                          ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                          : 'border-stone-200 dark:border-dark-border text-stone-500 dark:text-stone-400 hover:border-rose-300 hover:text-rose-500 dark:hover:text-rose-400'
                      }`}
                    >
                      {clearingLocal && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
                      {clearingLocal ? 'Clearing…' : confirmClear ? 'Confirm — this will erase local data!' : 'Drop local data & sync fresh'}
                    </button>

                    {diagnostics && (
                      <div className="rounded-lg border border-stone-100 dark:border-dark-border bg-stone-50 dark:bg-dark-card px-3 py-2.5 space-y-1.5 text-[11px] font-mono">
                        <div className="flex justify-between">
                          <span className="text-stone-400">Session</span>
                          <span className={diagnostics.hasSession ? 'text-emerald-500' : 'text-rose-500'}>
                            {diagnostics.hasSession ? `✓ ${diagnostics.sessionEmail ?? ''}` : '✗ Not logged in'}
                          </span>
                        </div>
                        {diagnostics.sessionUserId && (
                          <div className="flex justify-between gap-2">
                            <span className="text-stone-400 flex-shrink-0">User ID</span>
                            <span className="text-stone-500 break-all text-right">{diagnostics.sessionUserId}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-stone-400">Token</span>
                          <span className={
                            diagnostics.tokenExpiresInSeconds === null ? 'text-stone-400'
                            : diagnostics.tokenExpiresInSeconds < 0 ? 'text-rose-500'
                            : diagnostics.tokenExpiresInSeconds < 120 ? 'text-amber-500'
                            : 'text-emerald-500'
                          }>
                            {diagnostics.tokenExpiresInSeconds === null ? '—'
                              : diagnostics.tokenExpiresInSeconds < 0 ? `✗ expired ${Math.abs(Math.round(diagnostics.tokenExpiresInSeconds / 60))}m ago`
                              : `✓ ${Math.round(diagnostics.tokenExpiresInSeconds / 60)}m remaining`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Premium</span>
                          <span className={diagnostics.isPremium ? 'text-emerald-500' : 'text-rose-500'}>
                            {diagnostics.isPremium
                              ? `✓ ${diagnostics.subscriptionPlan ?? ''} (${diagnostics.subscriptionStatus ?? ''})`
                              : `✗ ${diagnostics.subscriptionStatus ?? 'not found'}`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Queue</span>
                          <span className={diagnostics.queueLength > 0 ? 'text-amber-500' : 'text-stone-500'}>
                            {diagnostics.queueLength} pending
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Last sync</span>
                          <span className="text-stone-500">
                            {diagnostics.lastSyncAt ? new Date(diagnostics.lastSyncAt).toLocaleTimeString() : 'never'}
                          </span>
                        </div>
                        {diagnostics.syncErrorMessage && (
                          <div className="pt-1 text-rose-500 break-all">
                            ✗ {diagnostics.syncErrorMessage}
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-stone-400">Network</span>
                          <span className={diagnostics.isOnline ? 'text-emerald-500' : 'text-rose-500'}>
                            {diagnostics.isOnline ? '✓ online' : '✗ offline'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sign out */}
                <button
                  onClick={signOut}
                  className="w-full border border-stone-200 dark:border-dark-border text-stone-600 dark:text-stone-300 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2 text-center py-2">
                  <p className="text-sm font-medium text-stone-700 dark:text-stone-200">Sign in to Work Timer</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Enable cloud sync across devices and unlock Premium features.
                  </p>
                </div>
                <button
                  onClick={signIn}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
                >
                  Sign in
                </button>
                <button
                  onClick={() => chrome.tabs.create({ url: `${WEBSITE_URL}/register` })}
                  className="w-full border border-stone-200 dark:border-dark-border text-stone-600 dark:text-stone-300 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors"
                >
                  Create account
                </button>
              </>
            )}
          </>
        )}

      </div>

      <UpgradePrompt
        isOpen={showUpgradeForProject}
        feature="Unlimited projects"
        onClose={() => setShowUpgradeForProject(false)}
      />

      <ConfirmDialog
        isOpen={!!confirmArchive}
        title="Archive Project?"
        message={`Are you sure you want to archive "${confirmArchive?.name}"? You can restore it later from the archived projects section.`}
        confirmText="Archive"
        cancelText="Cancel"
        variant="warning"
        onConfirm={() => {
          if (confirmArchive) {
            archive(confirmArchive.id)
            setConfirmArchive(null)
          }
        }}
        onCancel={() => setConfirmArchive(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmDeleteProject}
        title="Delete Project?"
        message={`Are you sure you want to permanently delete "${confirmDeleteProject?.name}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteProject) {
            void remove(confirmDeleteProject.id)
            setConfirmDeleteProject(null)
          }
        }}
        onCancel={() => setConfirmDeleteProject(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmDeleteTag}
        title="Delete Tag?"
        message={`Are you sure you want to delete "${confirmDeleteTag?.name}"? This will remove it from all entries that use it.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteTag) {
            removeTag(confirmDeleteTag.id)
            setConfirmDeleteTag(null)
          }
        }}
        onCancel={() => setConfirmDeleteTag(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmArchiveTag}
        title="Archive Tag?"
        message={`Are you sure you want to archive "${confirmArchiveTag?.name}"? You can restore it later from the archived tags section.`}
        confirmText="Archive"
        cancelText="Cancel"
        variant="warning"
        onConfirm={() => {
          if (confirmArchiveTag) {
            void archiveTag(confirmArchiveTag.id)
            setConfirmArchiveTag(null)
          }
        }}
        onCancel={() => setConfirmArchiveTag(null)}
      />
    </div>
  )
}
