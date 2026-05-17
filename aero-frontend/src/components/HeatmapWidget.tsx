import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  format,
  parseISO,
  subDays,
  eachWeekOfInterval,
  startOfWeek,
  endOfWeek,
  addDays,
} from 'date-fns'
import { briefApi, type HeatmapEntry } from '@/api/brief.api'
import { Skeleton } from '@/components/ui'

function cellColor(count: number, max: number): string {
  if (count === 0) return 'var(--bg-elevated)'
  const t = Math.min(count / Math.max(max, 1), 1)
  if (t < 0.25) return 'rgba(var(--accent-rgb, 245, 158, 11), 0.25)'
  if (t < 0.5) return 'rgba(var(--accent-rgb, 245, 158, 11), 0.45)'
  if (t < 0.75) return 'rgba(var(--accent-rgb, 245, 158, 11), 0.68)'
  return 'var(--accent)'
}

interface Props {
  days?: number
  className?: string
  large?: boolean
}

type Cell = { date: string; count: number }
type WeekCol = Array<Cell | null>

export function HeatmapWidget({ days = 365, className = '', large = false }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['heatmap', days],
    queryFn: () => briefApi.heatmap(days),
    staleTime: 5 * 60_000,
  })

  const { grid, weeks, max } = useMemo(() => {
    const today = new Date()
    const start = subDays(today, days - 1)

    const countByDate = new Map<string, number>()
    ;(data ?? []).forEach((e: HeatmapEntry) => countByDate.set(e.date, Number(e.count)))

    const weekStarts = eachWeekOfInterval(
      {
        start: startOfWeek(start, { weekStartsOn: 0 }),
        end: endOfWeek(today, { weekStartsOn: 0 }),
      },
      { weekStartsOn: 0 }
    )

    const cols: WeekCol[] = weekStarts.map(weekStart =>
      Array.from({ length: 7 }, (_, dayIndex) => {
        const d = addDays(weekStart, dayIndex)
        if (d < start || d > today) return null
        const dateStr = format(d, 'yyyy-MM-dd')
        return { date: dateStr, count: countByDate.get(dateStr) ?? 0 }
      })
    )

    const maxCount = Math.max(1, ...Array.from(countByDate.values()))
    return { grid: cols, weeks: cols.length, max: maxCount }
  }, [data, days])

  const MONTH_LABELS = useMemo(() => {
    const rawLabels: { month: string; year: string; col: number }[] = []
    const usedMonths = new Set<string>()

    grid.forEach((week, colIndex) => {
      const inRangeCells = week.filter((cell): cell is Cell => cell !== null)
      if (inRangeCells.length === 0) return

      const monthStartCell = inRangeCells.find(cell => parseISO(cell.date).getDate() === 1)
      const anchor = monthStartCell ?? (colIndex === 0 ? inRangeCells[0] : null)
      if (!anchor) return

      const d = parseISO(anchor.date)
      const monthKey = format(d, 'yyyy-MM')
      if (usedMonths.has(monthKey)) return

      usedMonths.add(monthKey)
      rawLabels.push({ month: format(d, 'MMM'), year: format(d, 'yy'), col: colIndex })
    })

    const monthCounts = rawLabels.reduce<Record<string, number>>((acc, item) => {
      acc[item.month] = (acc[item.month] ?? 0) + 1
      return acc
    }, {})

    const mapped = rawLabels.map(item => ({
      label: monthCounts[item.month] > 1 ? `${item.month} '${item.year}` : item.month,
      col: item.col,
    }))

    const minGapCols = large ? 4 : 3
    const spaced: { label: string; col: number }[] = []
    for (const item of mapped) {
      const prev = spaced[spaced.length - 1]
      if (!prev || item.col - prev.col >= minGapCols) spaced.push(item)
    }
    return spaced
  }, [grid, large])

  const cellSize = large ? 16 : 10
  const gap = large ? 5 : 3
  const colWidth = cellSize + gap
  const leftPad = large ? 32 : 22

  if (isLoading) return <Skeleton className={`${large ? 'h-44' : 'h-28'} ${className}`} />

  return (
    <div className={`card p-5 overflow-x-auto ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-display font-bold text-sm text-txt-primary">Activity Heatmap</h2>
        <span className="text-[11px] text-txt-muted font-mono">
          {data?.reduce((sum, e) => sum + e.count, 0) ?? 0} tasks completed
        </span>
      </div>

      <div className="relative mb-1" style={{ paddingLeft: leftPad }}>
        <div style={{ minWidth: weeks * colWidth }}>
          {MONTH_LABELS.map(({ label, col }) => (
            <div
              key={`${label}-${col}`}
              className="absolute text-[10px] text-txt-muted font-mono"
              style={{ left: leftPad + col * colWidth }}
            >
              {label}
            </div>
          ))}
        </div>
        <div style={{ height: 14 }} />
      </div>

      <div className="flex gap-1" style={{ minWidth: weeks * colWidth + leftPad }}>
        <div className="flex flex-col gap-[3px] shrink-0 mt-0.5">
          {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, idx) => (
            <div
              key={idx}
              className="text-[9px] text-txt-muted font-mono w-5 text-right leading-none"
              style={{ height: cellSize }}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="flex gap-[3px]">
          {grid.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-[3px]">
              {week.map((cell, dayIdx) => {
                if (!cell) return <div key={dayIdx} style={{ width: cellSize, height: cellSize }} />

                return (
                  <div
                    key={dayIdx}
                    title={`${cell.date}: ${cell.count} task${cell.count !== 1 ? 's' : ''}`}
                    className="rounded-[2px] transition-opacity hover:opacity-80 cursor-default"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: cellColor(cell.count, max),
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] text-txt-muted">Less</span>
        {[0, 1, 2, 3, 4].map(step => (
          <div
            key={step}
            className="rounded-[2px]"
            style={{
              width: 10,
              height: 10,
              minWidth: 10,
              background: step === 0 ? 'var(--bg-elevated)' : `rgba(var(--accent-rgb, 245, 158, 11), ${0.2 + step * 0.2})`,
            }}
          />
        ))}
        <span className="text-[10px] text-txt-muted">More</span>
      </div>
    </div>
  )
}
