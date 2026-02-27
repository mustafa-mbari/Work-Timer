import { useState, useRef, useEffect, useCallback, memo } from 'react'
import type { Tag } from '@/types'
import { ChevronDownIcon } from './Icons'

interface TagSelectProps {
  tags: Tag[]
  value: string
  onChange: (tagId: string) => void
  disabled?: boolean
  className?: string
}

export default memo(function TagSelect({ tags, value, onChange, disabled, className }: TagSelectProps) {
  const [open, setOpen] = useState(false)
  const [focusIdx, setFocusIdx] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = tags.find(t => t.id === value)

  const close = useCallback(() => { setOpen(false); setFocusIdx(-1) }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, close])

  // Scroll focused item into view
  useEffect(() => {
    if (!open || focusIdx < 0 || !listRef.current) return
    const items = listRef.current.querySelectorAll('[role="option"]')
    items[focusIdx]?.scrollIntoView({ block: 'nearest' })
  }, [focusIdx, open])

  const items = [{ id: '', name: 'No Tag', color: '' }, ...tags]
  const totalItems = items.length

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
        setFocusIdx(items.findIndex(t => t.id === value))
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusIdx(i => (i + 1) % totalItems)
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusIdx(i => (i - 1 + totalItems) % totalItems)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusIdx >= 0 && focusIdx < totalItems) {
          onChange(items[focusIdx].id)
          close()
        }
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select tag"
        className={`w-full border border-stone-300 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400 disabled:opacity-50 flex items-center gap-2 text-left`}
      >
        {selected ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color ?? '#6366F1' }} />
            <span className="flex-1 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-stone-400 dark:text-stone-500">No Tag</span>
        )}
        <ChevronDownIcon className={`w-3.5 h-3.5 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div
          ref={listRef}
          role="listbox"
          onKeyDown={handleKeyDown}
          className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-dark-card border border-stone-200 dark:border-dark-border rounded-xl shadow-lg z-50 py-1.5 max-h-48 overflow-y-auto animate-fade-in"
        >
          {items.map((tag, idx) => (
            <button
              key={tag.id || '__none__'}
              type="button"
              role="option"
              aria-selected={tag.id === value}
              onClick={() => { onChange(tag.id); close() }}
              onMouseEnter={() => setFocusIdx(idx)}
              className={`w-full text-left px-3.5 py-2 text-sm flex items-center gap-2 transition-colors ${
                idx === focusIdx
                  ? 'bg-indigo-50 dark:bg-indigo-500/10'
                  : 'hover:bg-stone-50 dark:hover:bg-dark-hover'
              } ${tag.id === value ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-stone-700 dark:text-stone-300'}`}
            >
              {tag.color ? (
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
              ) : (
                <span className="w-2.5 h-2.5 flex-shrink-0" />
              )}
              <span className="truncate">{tag.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
