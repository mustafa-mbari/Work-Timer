/**
 * Context menu setup and state refresh for the toolbar action button.
 * Click handler is registered in background.ts to avoid circular imports.
 */
import { getTimerState } from './storage'

export function setupContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'toggle-timer',
      title: 'Start Timer',
      contexts: ['action'],
    })
    chrome.contextMenus.create({
      id: 'toggle-pause',
      title: 'Pause Timer',
      contexts: ['action'],
    })
    chrome.contextMenus.create({
      id: 'show-widget',
      title: 'Show Floating Widget',
      contexts: ['action'],
      enabled: false,
    })
  })
}

export async function refreshContextMenus(): Promise<void> {
  const state = await getTimerState()
  chrome.contextMenus.update('toggle-timer', {
    title: state.status === 'idle' ? 'Start Timer' : 'Stop Timer',
  })
  chrome.contextMenus.update('toggle-pause', {
    title: state.status === 'running' ? 'Pause Timer' : 'Resume Timer',
    enabled: state.status !== 'idle',
  })
  chrome.contextMenus.update('show-widget', {
    enabled: state.status !== 'idle',
  })
}
