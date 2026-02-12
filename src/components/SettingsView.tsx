import { useState, useEffect } from 'react'
import type { Settings } from '@/types'
import { getSettings, updateSettings } from '@/storage'
import { useProjects } from '@/hooks/useProjects'

const PROJECT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
]

export default function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const { activeProjects, projects, create, update, archive } = useProjects()

  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0])
  const [showArchived, setShowArchived] = useState(false)

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

  if (!settings) return null

  const archivedProjects = projects.filter(p => p.archived)

  return (
    <div className="flex flex-col p-4 gap-4">
      <h2 className="text-sm font-semibold text-gray-800">Settings</h2>

      {/* Working Days */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Working Days</label>
        <div className="flex gap-1">
          {[5, 6, 7].map((d) => (
            <button
              key={d}
              onClick={() => handleSettingChange('workingDays', d)}
              className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${
                settings.workingDays === d
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {/* Week Start Day */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Week Starts On</label>
        <div className="flex gap-1">
          {([1, 0] as const).map((d) => (
            <button
              key={d}
              onClick={() => handleSettingChange('weekStartDay', d)}
              className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${
                settings.weekStartDay === d
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {d === 1 ? 'Monday' : 'Sunday'}
            </button>
          ))}
        </div>
      </div>

      {/* Daily & Weekly Targets */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Daily Target (hours)</label>
        <input
          type="number"
          min="0"
          max="24"
          step="0.5"
          value={settings.dailyTarget ?? ''}
          onChange={(e) => handleSettingChange('dailyTarget', e.target.value ? Number(e.target.value) : null)}
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Daily target hours"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Weekly Target (hours)</label>
        <input
          type="number"
          min="0"
          max="168"
          step="1"
          value={settings.weeklyTarget ?? ''}
          onChange={(e) => handleSettingChange('weeklyTarget', e.target.value ? Number(e.target.value) : null)}
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Weekly target hours"
        />
      </div>

      {/* Idle Detection */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Idle Detection (minutes)</label>
        <input
          type="number"
          min="1"
          max="60"
          value={settings.idleTimeout}
          onChange={(e) => handleSettingChange('idleTimeout', Number(e.target.value))}
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Idle detection timeout in minutes"
        />
      </div>

      {/* Pomodoro Settings */}
      <div>
        <label className="text-xs text-gray-500 block mb-2">Pomodoro</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Work (min)</label>
            <input
              type="number"
              min="1"
              max="120"
              value={settings.pomodoro.workMinutes}
              onChange={(e) => handleSettingChange('pomodoro', { ...settings.pomodoro, workMinutes: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Short Break (min)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={settings.pomodoro.shortBreakMinutes}
              onChange={(e) => handleSettingChange('pomodoro', { ...settings.pomodoro, shortBreakMinutes: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Long Break (min)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={settings.pomodoro.longBreakMinutes}
              onChange={(e) => handleSettingChange('pomodoro', { ...settings.pomodoro, longBreakMinutes: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Sessions before long</label>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.pomodoro.sessionsBeforeLongBreak}
              onChange={(e) => handleSettingChange('pomodoro', { ...settings.pomodoro, sessionsBeforeLongBreak: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 mt-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.pomodoro.soundEnabled}
            onChange={(e) => handleSettingChange('pomodoro', { ...settings.pomodoro, soundEnabled: e.target.checked })}
            className="rounded border-gray-300"
          />
          Sound notifications
        </label>
      </div>

      {/* Keyboard Shortcuts */}
      <div>
        <label className="text-xs text-gray-500 block mb-2">Keyboard Shortcuts</label>
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between py-1 px-2 rounded bg-gray-50">
            <span className="text-gray-600">Open Popup</span>
            <kbd className="px-2 py-0.5 rounded bg-white border border-gray-300 text-gray-700 font-mono text-[10px]">
              Alt+Shift+O
            </kbd>
          </div>
          <div className="flex items-center justify-between py-1 px-2 rounded bg-gray-50">
            <span className="text-gray-600">Start/Stop Timer</span>
            <kbd className="px-2 py-0.5 rounded bg-white border border-gray-300 text-gray-700 font-mono text-[10px]">
              Alt+Shift+↑
            </kbd>
          </div>
          <div className="flex items-center justify-between py-1 px-2 rounded bg-gray-50">
            <span className="text-gray-600">Pause/Resume Timer</span>
            <kbd className="px-2 py-0.5 rounded bg-white border border-gray-300 text-gray-700 font-mono text-[10px]">
              Alt+Shift+↓
            </kbd>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          Shortcuts work globally in Chrome, even when the popup is closed.
        </p>
      </div>

      {/* Projects */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-gray-500">Projects</label>
          {archivedProjects.length > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-[10px] text-blue-600 hover:underline"
            >
              {showArchived ? 'Hide archived' : `Show archived (${archivedProjects.length})`}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1.5 mb-2">
          {activeProjects.map((project) => (
            <div key={project.id} className="flex items-center gap-2 p-1.5 rounded-lg border border-gray-100">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
                aria-hidden="true"
              />
              <span className="text-sm text-gray-700 flex-1">{project.name}</span>
              <button
                onClick={() => archive(project.id)}
                className="text-[10px] text-gray-400 hover:text-red-500 px-1"
                aria-label={`Archive ${project.name}`}
              >
                Archive
              </button>
            </div>
          ))}

          {showArchived && archivedProjects.map((project) => (
            <div key={project.id} className="flex items-center gap-2 p-1.5 rounded-lg border border-gray-100 opacity-50">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
                aria-hidden="true"
              />
              <span className="text-sm text-gray-400 flex-1 line-through">{project.name}</span>
              <button
                onClick={() => update({ ...project, archived: false })}
                className="text-[10px] text-blue-500 hover:underline px-1"
                aria-label={`Restore ${project.name}`}
              >
                Restore
              </button>
            </div>
          ))}
        </div>

        {/* New Project */}
        <div className="flex gap-1.5 items-end">
          <div className="flex-1">
            <input
              type="text"
              placeholder="New project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="New project name"
            />
          </div>
          <div className="flex gap-0.5">
            {PROJECT_COLORS.slice(0, 5).map((color) => (
              <button
                key={color}
                onClick={() => setNewProjectColor(color)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  newProjectColor === color ? 'border-gray-800 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
          <button
            onClick={handleCreateProject}
            disabled={!newProjectName.trim()}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            aria-label="Add project"
          >
            +
          </button>
        </div>
      </div>

      {/* Version */}
      <div className="text-center text-[10px] text-gray-300 pt-2">
        Work Timer v1.0.0
      </div>
    </div>
  )
}
