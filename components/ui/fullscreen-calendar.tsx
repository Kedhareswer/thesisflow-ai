"use client"

import * as React from "react"
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfToday,
  startOfWeek,
} from "date-fns"
import { ChevronLeft, ChevronRight, PlusCircle, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface Event {
  id: string | number
  name: string
  time: string
  datetime: string
}

interface CalendarData {
  day: Date
  events: Event[]
}

interface FullScreenCalendarProps {
  data: CalendarData[]
}

const colStartClasses = [
  "",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
]

export function FullScreenCalendar({ data }: FullScreenCalendarProps) {
  const today = startOfToday()
  const [selectedDay, setSelectedDay] = React.useState(today)
  const [currentMonth, setCurrentMonth] = React.useState(format(today, "MMM-yyyy"))
  const firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date())

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth)),
  })

  function previousMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 })
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"))
  }
  function nextMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 })
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"))
  }
  function goToToday() {
    setCurrentMonth(format(today, "MMM-yyyy"))
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex flex-col space-y-4 p-4 md:flex-row md:items-center md:justify-between md:space-y-0 lg:flex-none">
        <div className="flex flex-auto">
          <div className="flex items-center gap-4">
            <div className="hidden w-20 flex-col items-center justify-center rounded-lg border bg-muted p-0.5 md:flex">
              <h1 className="p-1 text-xs uppercase text-muted-foreground">{format(today, "MMM")}</h1>
              <div className="flex w-full items-center justify-center rounded-lg border bg-background p-0.5 text-lg font-bold">
                <span>{format(today, "d")}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-foreground">{format(firstDayCurrentMonth, "MMMM, yyyy")}</h2>
              <p className="text-sm text-muted-foreground">
                {format(firstDayCurrentMonth, "MMM d, yyyy")} - {format(endOfMonth(firstDayCurrentMonth), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
          <Button variant="outline" size="icon" className="hidden lg:flex">
            <Search size={16} aria-hidden="true" />
          </Button>
          <Separator orientation="vertical" className="hidden h-6 lg:block" />
          <div className="inline-flex w-full -space-x-px rounded-lg shadow-sm shadow-black/5 md:w-auto rtl:space-x-reverse">
            <Button onClick={previousMonth} variant="outline" size="icon" className="rounded-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10" aria-label="Previous month">
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <Button onClick={goToToday} variant="outline" className="w-full rounded-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 md:w-auto">
              Today
            </Button>
            <Button onClick={nextMonth} variant="outline" size="icon" className="rounded-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10" aria-label="Next month">
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>
          <Separator orientation="vertical" className="hidden h-6 md:block" />
          <Separator orientation="horizontal" className="block w-full md:hidden" />
          <Button className="w-full gap-2 md:w-auto">
            <PlusCircle size={16} aria-hidden="true" />
            New Event
          </Button>
        </div>
      </div>
      {/* Weekday header */}
      <div className="lg:flex lg:flex-auto lg:flex-col">
        <div className="grid grid-cols-7 border text-center text-xs font-semibold leading-[22px] lg:flex-none">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d)=>(<div key={d} className="border-r py-2.5 last:border-r-0">{d}</div>))}
        </div>
        {/* Days */}
        <div className="flex text-xs leading-6 lg:flex-auto">
          {/* Desktop */}
          <div className="hidden w-full border-x lg:grid lg:grid-cols-7 lg:grid-rows-5">
            {days.map((day, dayIdx) => {
              const eventsForDay = data.filter((date) => isSameDay(date.day, day))
              return (
                <div
                  key={dayIdx}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    dayIdx === 0 && colStartClasses[getDay(day)],
                    !isEqual(day, selectedDay) && !isToday(day) && !isSameMonth(day, firstDayCurrentMonth) && "bg-accent/50 text-muted-foreground",
                    "relative flex flex-col border-b border-r hover:bg-muted focus:z-10",
                    !isEqual(day, selectedDay) && "hover:bg-accent/75",
                  )}
                >
                  <header className="flex items-center justify-between p-2.5">
                    <button
                      type="button"
                      className={cn(
                        isEqual(day, selectedDay) && "text-primary-foreground",
                        !isEqual(day, selectedDay) && !isToday(day) && isSameMonth(day, firstDayCurrentMonth) && "text-foreground",
                        !isEqual(day, selectedDay) && !isToday(day) && !isSameMonth(day, firstDayCurrentMonth) && "text-muted-foreground",
                        isEqual(day, selectedDay) && isToday(day) && "border-none bg-primary",
                        isEqual(day, selectedDay) && !isToday(day) && "bg-foreground",
                        (isEqual(day, selectedDay) || isToday(day)) && "font-semibold",
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs hover:border",
                      )}
                    >
                      <time dateTime={format(day, "yyyy-MM-dd")}>{format(day, "d")}</time>
                    </button>
                  </header>
                  <div className="flex-1 p-2.5 space-y-1.5">
                    {eventsForDay.slice(0,1).map((ev)=>(
                      <div key={ev.day.toString()} className="flex flex-col items-start gap-1 rounded-lg border bg-muted/50 p-2 text-[11px] leading-tight">
                        <p className="font-medium leading-none">{ev.events[0]?.name}</p>
                        <p className="leading-none text-muted-foreground">{ev.events[0]?.time}</p>
                      </div>
                    ))}
                    {eventsForDay.length>1 && <div className="text-xs text-muted-foreground">+ {eventsForDay.length-1} more</div>}
                  </div>
                </div>
              )
            })}
          </div>
          {/* Mobile */}
          <div className="isolate grid w-full grid-cols-7 grid-rows-5 border-x lg:hidden">
            {days.map((day, dayIdx) => {
              const eventsForDay = data.filter((date) => isSameDay(date.day, day))
              return (
                <button
                  key={dayIdx}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    isEqual(day, selectedDay) && "text-primary-foreground",
                    !isEqual(day, selectedDay) && !isToday(day) && isSameMonth(day, firstDayCurrentMonth) && "text-foreground",
                    !isEqual(day, selectedDay) && !isToday(day) && !isSameMonth(day, firstDayCurrentMonth) && "text-muted-foreground",
                    (isEqual(day, selectedDay) || isToday(day)) && "font-semibold",
                    "flex h-14 flex-col border-b border-r px-3 py-2 hover:bg-muted focus:z-10",
                  )}
                >
                  <time
                    dateTime={format(day, "yyyy-MM-dd")}
                    className={cn(
                      "ml-auto flex size-6 items-center justify-center rounded-full",
                      isEqual(day, selectedDay) && "bg-primary text-primary-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </time>
                  {eventsForDay.length>0 && (
                    <div className="-mx-0.5 mt-auto flex flex-wrap-reverse">
                      {eventsForDay.flatMap(e=>e.events).map(evt=> (
                        <span key={evt.id} className="mx-0.5 mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
