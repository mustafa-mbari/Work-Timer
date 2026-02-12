import { useState, useEffect } from 'react'
import type { Settings } from '@/types'
import { getSettings, updateSettings } from '@/storage'
import { useProjects } from '@/hooks/useProjects'
import { useTags } from '@/hooks/useTags'
import { useTheme, THEMES } from '@/hooks/useTheme'
import { MonitorIcon, PlusIcon, XIcon } from './Icons'

const PROJECT_COLORS = [
  '#6366F1', '#F43F5E', '#10B981', '#F59E0B', '#A855F7',
  '#EC4899', '#06B6D4', '#F97316', '#3B82F6', '#14B8A6',
]

type SettingsTab = 'general' | 'timer' | 'data'

export default function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const { activeProjects, projects, create, update, archive } = useProjects()
  const { tags, create: createTag, update: updateTag, remove: removeTag } = useTags()
  const { theme, setTheme } = useTheme()

  const [tab, setTab] = useState<SettingsTab>('general')

  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0])
  const [showArchived, setShowArchived] = useState(false)
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; color: string } | null>(null)

  const [newTagName, setNewTagName] = useState('')
  const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  const handleSettingChange = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!settings) return
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    await updateSettings({ [key]: value })
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    await create(newProjectName.trim(), newProjectColor)
    setNewProjectName('')
    setNewProjectColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)])
  }

  const handleSaveProject = async () => {
    if (!editingProject || !editingProject.name.trim()) return
    const project = projects.find(p => p.id === editingProject.id)
    if (!project) return
    await update({ ...project, name: editingProject.name.trim(), color: editingProject.color })
    setEditingProject(null)
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

  const inputClass = "w-full border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
  const labelClass = "text-[11px] font-medium text-stone-500 dark:text-stone-400 block mb-1.5"

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
          {(['general', 'timer', 'data'] as SettingsTab[]).map((t) => (
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
                      <div className="flex gap-1.5 flex-wrap">
                        {PROJECT_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditingProject({ ...editingProject, color })}
                            className={`w-5 h-5 rounded-full border-2 transition-all ${editingProject.color === color ? 'border-stone-800 dark:border-stone-200 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                            aria-label={`Select color ${color}`}
                          />
                        ))}
                      </div>
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
                    <div key={project.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-stone-100 dark:border-dark-border bg-white dark:bg-dark-card">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} aria-hidden="true" />
                      <span className="text-sm text-stone-700 dark:text-stone-200 flex-1">{project.name}</span>
                      <button
                        onClick={() => setEditingProject({ id: project.id, name: project.name, color: project.color })}
                        className="text-[10px] font-medium text-stone-400 dark:text-stone-500 hover:text-indigo-500 dark:hover:text-indigo-400 px-1.5 py-0.5 rounded transition-colors"
                        aria-label={`Edit ${project.name}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => archive(project.id)}
                        className="text-[10px] font-medium text-stone-400 dark:text-stone-500 hover:text-rose-500 dark:hover:text-rose-400 px-1.5 py-0.5 rounded transition-colors"
                        aria-label={`Archive ${project.name}`}
                      >
                        Archive
                      </button>
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

            {/* Work Types */}
            <div>
              <label className={labelClass}>Work Types</label>

              <div className="flex flex-col gap-1.5 mb-3">
                {tags.map((tag) => (
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
                    <div key={tag.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-stone-100 dark:border-dark-border bg-white dark:bg-dark-card">
                      <span className="text-sm text-stone-700 dark:text-stone-200 flex-1">{tag.name}</span>
                      <button
                        onClick={() => setEditingTag({ id: tag.id, name: tag.name })}
                        className="text-[10px] font-medium text-stone-400 dark:text-stone-500 hover:text-indigo-500 dark:hover:text-indigo-400 px-1.5 py-0.5 rounded transition-colors"
                        aria-label={`Edit ${tag.name}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeTag(tag.id)}
                        className="text-[10px] font-medium text-stone-400 dark:text-stone-500 hover:text-rose-500 dark:hover:text-rose-400 px-1.5 py-0.5 rounded transition-colors"
                        aria-label={`Delete ${tag.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  )
                ))}
                {tags.length === 0 && (
                  <div className="text-xs text-stone-400 dark:text-stone-600 text-center py-3">No work types yet</div>
                )}
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="New work type name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                    className={`${inputClass} dark:placeholder-stone-600`}
                    aria-label="New work type name"
                  />
                </div>
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="bg-indigo-500 text-white p-2 rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-colors shadow-sm shadow-indigo-500/20"
                  aria-label="Add work type"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
