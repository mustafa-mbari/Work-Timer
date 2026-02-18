import { useEffect, useRef, useState, memo, Fragment } from 'react'
import { formatDuration } from '@/utils/date'

const DIGIT_H = 64
const DIGIT_W = 36

const FONT_STYLE = { fontFamily: "'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif" }

interface RollingDigitProps {
  value: number
  maxDigit?: number
}

const RollingDigit = memo(function RollingDigit({ value, maxDigit = 9 }: RollingDigitProps) {
  const prevRef = useRef(value)
  const [offset, setOffset] = useState(value)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = value

    if (prev === value) return

    if (value < prev) {
      // Wrap around: roll forward to the duplicate position at end of strip
      setShouldAnimate(true) // eslint-disable-line react-hooks/set-state-in-effect
      setOffset(maxDigit + 1)
      const t = setTimeout(() => {
        setShouldAnimate(false)
        setOffset(value)
      }, 300)
      return () => clearTimeout(t)
    }

    setShouldAnimate(true)
    setOffset(value)
  }, [value, maxDigit])

  // Build digit strip: [0, 1, ..., maxDigit, 0] — extra 0 at end for wrap-around
  const digits = [...Array.from({ length: maxDigit + 1 }, (_, i) => i), 0]

  return (
    <div className="relative overflow-hidden" style={{ height: DIGIT_H, width: DIGIT_W }}>
      <div
        style={{
          transform: `translateY(-${offset * DIGIT_H}px)`,
          transition: shouldAnimate ? 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
      >
        {digits.map((d, i) => (
          <div key={i} className="flex items-center justify-center" style={{ height: DIGIT_H }}>
            <span
              className="text-[46px] font-semibold leading-none text-stone-900 dark:text-white"
              style={FONT_STYLE}
            >
              {d}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})

interface RollingTimerProps {
  elapsed: number
}

export default function RollingTimer({ elapsed }: RollingTimerProps) {
  const totalSeconds = Math.floor(elapsed / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const groups = [
    { tens: Math.floor(hours / 10), ones: hours % 10, tensMax: 9 },
    { tens: Math.floor(minutes / 10), ones: minutes % 10, tensMax: 5 },
    { tens: Math.floor(seconds / 10), ones: seconds % 10, tensMax: 5 },
  ]

  return (
    <div
      className="flex items-center justify-center gap-2.5"
      role="timer"
      aria-live="polite"
      aria-label={`Timer: ${formatDuration(elapsed)}`}
    >
      {groups.map((g, gi) => (
        <Fragment key={gi}>
          {gi > 0 && (
            <span
              className="text-2xl font-semibold leading-none text-stone-400 dark:text-stone-500"
              style={FONT_STYLE}
            >
              :
            </span>
          )}
          <div className="relative flex rolling-face rounded-xl overflow-hidden px-1">
            <RollingDigit value={g.tens} maxDigit={g.tensMax} />
            <RollingDigit value={g.ones} maxDigit={9} />
            {/* Gradient overlay spans entire face for seamless 3D drum effect */}
            <div className="absolute inset-0 pointer-events-none z-10 rolling-face-gradient" />
          </div>
        </Fragment>
      ))}
    </div>
  )
}
