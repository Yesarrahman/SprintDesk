'use client'

import React, { useState } from 'react'
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface DateRange {
  from: string // YYYY-MM-DD
  to: string   // YYYY-MM-DD
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempFrom, setTempFrom] = useState(value.from)
  const [tempTo, setTempTo] = useState(value.to)
  const [activePreset, setActivePreset] = useState<string>('last_30')

  const formatDateLabel = (dStr: string) => {
    if (!dStr) return ''
    try {
      const parts = dStr.split('-')
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }
      return dStr
    } catch {
      return dStr
    }
  }

  const toIsoDateString = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const applyPreset = (presetKey: string) => {
    const now = new Date()
    let from = new Date()
    let to = new Date()

    if (presetKey === 'last_7') {
      from.setDate(now.getDate() - 7)
    } else if (presetKey === 'last_30') {
      from.setDate(now.getDate() - 30)
    } else if (presetKey === 'this_month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    } else if (presetKey === 'last_month') {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      to = new Date(now.getFullYear(), now.getMonth(), 0)
    } else if (presetKey === 'this_year') {
      from = new Date(now.getFullYear(), 0, 1)
      to = new Date(now.getFullYear(), 11, 31)
    }

    const range = { from: toIsoDateString(from), to: toIsoDateString(to) }
    setTempFrom(range.from)
    setTempTo(range.to)
    setActivePreset(presetKey)
    onChange(range)
    setIsOpen(false)
  }

  const handleCustomApply = () => {
    if (tempFrom && tempTo) {
      setActivePreset('custom')
      onChange({ from: tempFrom, to: tempTo })
      setIsOpen(false)
    }
  }

  return (
    <div className={cn('relative inline-block', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-sm font-medium shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2 h-auto"
            >
              <CalendarIcon className="h-4 w-4 text-indigo-500" />
              <span>
                {formatDateLabel(value.from)} – {formatDateLabel(value.to)}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
            </Button>
          }
        />
        <PopoverContent className="w-80 p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-xl z-50">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Quick Presets
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: 'last_7', label: 'Last 7 Days' },
                  { key: 'last_30', label: 'Last 30 Days' },
                  { key: 'this_month', label: 'This Month' },
                  { key: 'last_month', label: 'Last Month' },
                ].map((p) => (
                  <Button
                    key={p.key}
                    type="button"
                    variant={activePreset === p.key ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => applyPreset(p.key)}
                    className={cn(
                      'justify-start text-xs h-8',
                      activePreset === p.key
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-medium'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    {activePreset === p.key && <Check className="h-3 w-3 mr-1 shrink-0" />}
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Custom Range
              </p>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-slate-500">From</Label>
                    <Input
                      type="date"
                      value={tempFrom}
                      onChange={(e) => setTempFrom(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-500">To</Label>
                    <Input
                      type="date"
                      value={tempTo}
                      onChange={(e) => setTempTo(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCustomApply}
                  className="w-full text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white mt-1"
                >
                  Apply Custom Range
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
