'use client';

import { Card } from '@/components/ui/card';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import {
  DndContext,
  MouseSensor,
  useDraggable,
  useSensor,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { useMouse, useThrottle, useWindowScroll } from '@uidotdev/usehooks';
import {
  addDays,
  addMonths,
  differenceInDays,
  differenceInHours,
  differenceInMonths,
  endOfDay,
  endOfMonth,
  format,
  formatDistance,
  getDate,
  getDaysInMonth,
  isSameDay,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { atom, useAtom } from 'jotai';
import throttle from 'lodash.throttle';
import { PlusIcon, TrashIcon } from 'lucide-react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type {
  CSSProperties,
  FC,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
  RefObject,
} from 'react';

// State atoms
const draggingAtom = atom(false);
const scrollXAtom = atom(0);

export const useGanttDragging = () => useAtom(draggingAtom);
export const useGanttScrollX = () => useAtom(scrollXAtom);

// Types
export type GanttStatus = { id: string; name: string; color: string };

export type GanttFeature = {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date | null;
  status: GanttStatus;
};

export type GanttMarkerProps = { id: string; date: Date; label: string };

export type Range = 'daily' | 'monthly' | 'quarterly';

export type TimelineData = {
  year: number;
  quarters: { months: { days: number }[] }[];
}[];

export type GanttContextProps = {
  zoom: number;
  range: Range;
  columnWidth: number;
  sidebarWidth: number;
  headerHeight: number;
  rowHeight: number;
  onAddItem: ((date: Date) => void) | undefined;
  placeholderLength: number;
  timelineData: TimelineData;
  ref: RefObject<HTMLDivElement | null> | null;
};

// Helpers
const getsDaysIn = (range: Range) => {
  let fn = (_date: Date) => 1;
  if (range === 'monthly' || range === 'quarterly') fn = getDaysInMonth;
  return fn;
};

const getDifferenceIn = (range: Range) => {
  let fn = differenceInDays;
  if (range === 'monthly' || range === 'quarterly') fn = differenceInMonths;
  return fn;
};

const getInnerDifferenceIn = (range: Range) => {
  let fn = differenceInHours;
  if (range === 'monthly' || range === 'quarterly') fn = differenceInDays;
  return fn;
};

const getStartOf = (range: Range) => {
  let fn = startOfDay;
  if (range === 'monthly' || range === 'quarterly') fn = startOfMonth;
  return fn;
};

const getEndOf = (range: Range) => {
  let fn = endOfDay;
  if (range === 'monthly' || range === 'quarterly') fn = endOfMonth;
  return fn;
};

const getAddRange = (range: Range) => {
  let fn = addDays;
  if (range === 'monthly' || range === 'quarterly') fn = addMonths;
  return fn;
};

const getDateByMousePosition = (context: GanttContextProps, mouseX: number) => {
  const timelineStartDate = new Date(context.timelineData[0].year, 0, 1);
  const columnWidth = (context.columnWidth * context.zoom) / 100;
  const offset = Math.floor(mouseX / columnWidth);
  const daysIn = getsDaysIn(context.range);
  const addRange = getAddRange(context.range);
  const month = addRange(timelineStartDate, offset);
  const daysInMonth = daysIn(month);
  const pixelsPerDay = Math.max(1, Math.round(columnWidth / daysInMonth));
  const dayOffset = Math.floor((mouseX % columnWidth) / pixelsPerDay);
  const actualDate = addDays(month, dayOffset);
  return actualDate;
};

const createInitialTimelineData = (today: Date): TimelineData => {
  const data: TimelineData = [
    { year: today.getFullYear() - 1, quarters: [] as any },
    { year: today.getFullYear(), quarters: [] as any },
    { year: today.getFullYear() + 1, quarters: [] as any },
  ];
  for (const y of data) {
    y.quarters = new Array(4).fill(null).map((_, qi) => ({
      months: new Array(3).fill(null).map((_, mi) => {
        const month = qi * 3 + mi;
        return { days: getDaysInMonth(new Date(y.year, month, 1)) };
      }),
    }));
  }
  return data;
};

const getOffset = (date: Date, start: Date, ctx: GanttContextProps) => {
  const col = (ctx.columnWidth * ctx.zoom) / 100;
  const diff = getDifferenceIn(ctx.range);
  const startOf = getStartOf(ctx.range);
  const fullCols = diff(startOf(date), start);
  if (ctx.range === 'daily') return col * fullCols;
  const partial = date.getDate();
  const dim = getDaysInMonth(date);
  const ppd = col / dim;
  return fullCols * col + partial * ppd;
};

const getWidth = (startAt: Date, endAt: Date | null, ctx: GanttContextProps) => {
  const col = (ctx.columnWidth * ctx.zoom) / 100;
  if (!endAt) return col * 2;
  const diff = getDifferenceIn(ctx.range);
  if (ctx.range === 'daily') return col * Math.max(1, diff(endAt, startAt));
  const dimStart = getDaysInMonth(startAt);
  const ppdStart = col / dimStart;
  if (isSameDay(startAt, endAt)) return ppdStart;
  const innerDiff = getInnerDifferenceIn(ctx.range);
  const startOf = getStartOf(ctx.range);
  if (isSameDay(startOf(startAt), startOf(endAt))) {
    return innerDiff(endAt, startAt) * ppdStart;
  }
  const startOffset = dimStart - getDate(startAt);
  const endOffset = getDate(endAt);
  const fullRange = diff(startOf(endAt), startOf(startAt));
  const dimEnd = getDaysInMonth(endAt);
  const ppdEnd = col / dimEnd;
  return (fullRange - 1) * col + startOffset * ppdStart + endOffset * ppdEnd;
};

const calculateInnerOffset = (date: Date, range: Range, colWidth: number) => {
  const start = getStartOf(range)(date);
  const end = getEndOf(range)(date);
  const inner = getInnerDifferenceIn(range);
  const total = inner(end, start) || 1;
  const day = date.getDate();
  return (day / total) * colWidth;
};

// Context
const GanttContext = createContext<GanttContextProps>({
  zoom: 100,
  range: 'monthly',
  columnWidth: 50,
  headerHeight: 60,
  sidebarWidth: 300,
  rowHeight: 36,
  onAddItem: undefined,
  placeholderLength: 2,
  timelineData: [],
  ref: null,
});

// Header primitives
export type GanttContentHeaderProps = {
  renderHeaderItem: (index: number) => ReactNode;
  title: string;
  columns: number;
};

export const GanttContentHeader: FC<GanttContentHeaderProps> = ({
  title,
  columns,
  renderHeaderItem,
}) => {
  const id = useId();
  return (
    <div
      className="sticky top-0 z-20 grid w-full shrink-0 bg-background/90 backdrop-blur-sm"
      style={{ height: 'var(--gantt-header-height)' }}
    >
      <div>
        <div
          className="sticky inline-flex whitespace-nowrap px-3 py-2 text-muted-foreground text-xs"
          style={{ left: 'var(--gantt-sidebar-width)' }}
        >
          <p>{title}</p>
        </div>
      </div>
      <div
        className="grid w-full"
        style={{ gridTemplateColumns: `repeat(${columns}, var(--gantt-column-width))` }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <div key={`${id}-${index}`} className="shrink-0 border-border/50 border-b py-1 text-center text-xs">
            {renderHeaderItem(index)}
          </div>
        ))}
      </div>
    </div>
  );
};

const DailyHeader: FC = () => {
  const gantt = useContext(GanttContext);
  return (
    <>
      {gantt.timelineData.map((year) =>
        year.quarters
          .flatMap((q) => q.months)
          .map((month, idx) => (
            <div className="relative flex flex-col" key={`${year.year}-${idx}`}>
              <GanttContentHeader
                title={format(new Date(year.year, idx, 1), 'MMMM yyyy')}
                columns={month.days}
                renderHeaderItem={(i) => (
                  <div className="flex items-center justify-center gap-1">
                    <p>{format(addDays(new Date(year.year, idx, 1), i), 'd')}</p>
                    <p className="text-muted-foreground">{format(addDays(new Date(year.year, idx, 1), i), 'EEEEE')}</p>
                  </div>
                )}
              />
              <GanttColumns
                columns={month.days}
                isColumnSecondary={(i) => [0, 6].includes(addDays(new Date(year.year, idx, 1), i).getDay())}
              />
            </div>
          ))
      )}
    </>
  );
};

const MonthlyHeader: FC = () => {
  const gantt = useContext(GanttContext);
  return (
    <>
      {gantt.timelineData.map((year) => (
        <div className="relative flex flex-col" key={year.year}>
          <GanttContentHeader
            title={`${year.year}`}
            columns={year.quarters.flatMap((q) => q.months).length}
            renderHeaderItem={(i) => <p>{format(new Date(year.year, i, 1), 'MMM')}</p>}
          />
          <GanttColumns columns={year.quarters.flatMap((q) => q.months).length} />
        </div>
      ))}
    </>
  );
};

const QuarterlyHeader: FC = () => {
  const gantt = useContext(GanttContext);
  return (
    <>
      {gantt.timelineData.map((year) =>
        year.quarters.map((quarter, qi) => (
          <div className="relative flex flex-col" key={`${year.year}-${qi}`}>
            <GanttContentHeader
              title={`Q${qi + 1} ${year.year}`}
              columns={quarter.months.length}
              renderHeaderItem={(i) => <p>{format(new Date(year.year, qi * 3 + i, 1), 'MMM')}</p>}
            />
            <GanttColumns columns={quarter.months.length} />
          </div>
        ))
      )}
    </>
  );
};

const headers: Record<Range, FC> = { daily: DailyHeader, monthly: MonthlyHeader, quarterly: QuarterlyHeader };

export type GanttHeaderProps = { className?: string };
export const GanttHeader: FC<GanttHeaderProps> = ({ className }) => {
  const gantt = useContext(GanttContext);
  const Header = headers[gantt.range];
  return (
    <div className={cn('-space-x-px flex h-full w-max divide-x divide-border/50', className)}>
      <Header />
    </div>
  );
};

// Columns
export type GanttColumnProps = { index: number; isColumnSecondary?: (item: number) => boolean };
export const GanttColumn: FC<GanttColumnProps> = ({ index, isColumnSecondary }) => {
  const gantt = useContext(GanttContext);
  const [dragging] = useGanttDragging();
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();
  const [hovering, setHovering] = useState(false);
  const [windowScroll] = useWindowScroll();
  const handleMouseEnter = () => setHovering(true);
  const handleMouseLeave = () => setHovering(false);
  const top = useThrottle(
    mousePosition.y - (mouseRef.current?.getBoundingClientRect().y ?? 0) - (windowScroll.y ?? 0),
    10
  );
  return (
    <div
      className={cn('group relative h-full overflow-hidden', isColumnSecondary?.(index) ? 'bg-secondary' : '')}
      ref={mouseRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!dragging && hovering && gantt.onAddItem ? <GanttAddFeatureHelper top={top} /> : null}
    </div>
  );
};

export type GanttColumnsProps = { columns: number; isColumnSecondary?: (item: number) => boolean };
export const GanttColumns: FC<GanttColumnsProps> = ({ columns, isColumnSecondary }) => {
  const id = useId();
  return (
    <div
      className="divide grid h-full w-full divide-x divide-border/50"
      style={{ gridTemplateColumns: `repeat(${columns}, var(--gantt-column-width))` }}
    >
      {Array.from({ length: columns }).map((_, idx) => (
        <GanttColumn key={`${id}-${idx}`} index={idx} isColumnSecondary={isColumnSecondary} />
      ))}
    </div>
  );
};

// Sidebar
export const GanttSidebarHeader: FC = () => (
  <div
    className="sticky top-0 z-10 flex shrink-0 items-end justify-between gap-2.5 border-border/50 border-b bg-background/90 p-2.5 font-medium text-muted-foreground text-xs backdrop-blur-sm"
    style={{ height: 'var(--gantt-header-height)' }}
  >
    <p className="flex-1 truncate text-left">Issues</p>
    <p className="shrink-0">Duration</p>
  </div>
);

export type GanttSidebarItemProps = { feature: GanttFeature; onSelectItem?: (id: string) => void; className?: string };
export const GanttSidebarItem: FC<GanttSidebarItemProps> = ({ feature, onSelectItem, className }) => {
  const tempEndAt = feature.endAt && isSameDay(feature.startAt, feature.endAt) ? addDays(feature.endAt, 1) : feature.endAt;
  const duration = tempEndAt ? formatDistance(feature.startAt, tempEndAt) : `${formatDistance(feature.startAt, new Date())} so far`;
  const handleClick: MouseEventHandler<HTMLDivElement> = (e) => { if (e.target === e.currentTarget) onSelectItem?.(feature.id) };
  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => { if (e.key === 'Enter') onSelectItem?.(feature.id) };
  return (
    <div role="button" onClick={handleClick} onKeyDown={handleKeyDown} tabIndex={0}
      className={cn('relative flex items-center gap-2.5 p-2.5 text-xs', className)}
      style={{ height: 'var(--gantt-row-height)' }}
    >
      <div className="pointer-events-none h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: feature.status.color }} />
      <p className="pointer-events-none flex-1 truncate text-left font-medium">{feature.name}</p>
      <p className="pointer-events-none text-muted-foreground">{duration}</p>
    </div>
  );
};

export type GanttSidebarGroupProps = { children: ReactNode; name: string; className?: string };
export const GanttSidebarGroup: FC<GanttSidebarGroupProps> = ({ children, name, className }) => (
  <div className={className}>
    <p style={{ height: 'var(--gantt-row-height)' }} className="w-full truncate p-2.5 text-left font-medium text-muted-foreground text-xs">{name}</p>
    <div className="divide-y divide-border/50">{children}</div>
  </div>
);

export type GanttSidebarProps = { children: ReactNode; className?: string };
export const GanttSidebar: FC<GanttSidebarProps> = ({ children, className }) => (
  <div data-roadmap-ui="gantt-sidebar" className={cn('sticky left-0 z-30 h-max min-h-full overflow-clip border-border/50 border-r bg-background/90 backdrop-blur-md', className)}>
    <GanttSidebarHeader />
    <div className="space-y-4">{children}</div>
  </div>
);

// Add helper
export type GanttAddFeatureHelperProps = { top: number; className?: string };
export const GanttAddFeatureHelper: FC<GanttAddFeatureHelperProps> = ({ top, className }) => {
  const [scrollX] = useGanttScrollX();
  const gantt = useContext(GanttContext);
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();
  const handleClick = () => {
    const rect = gantt.ref?.current?.getBoundingClientRect();
    const x = mousePosition.x - (rect?.left ?? 0) + scrollX - gantt.sidebarWidth;
    const currentDate = getDateByMousePosition(gantt, x);
    gantt.onAddItem?.(currentDate);
  };
  return (
    <div className={cn('absolute top-0 w-full px-0.5', className)} style={{ marginTop: -gantt.rowHeight / 2, transform: `translateY(${top}px)` }} ref={mouseRef}>
      <button onClick={handleClick} type="button" className="flex h-full w-full items-center justify-center rounded-md border border-dashed p-2">
        <PlusIcon size={16} className="pointer-events-none select-none text-muted-foreground" />
      </button>
    </div>
  );
};

// Feature item
export type GanttFeatureItemCardProps = { id: GanttFeature['id']; children?: ReactNode };
export const GanttFeatureItemCard: FC<GanttFeatureItemCardProps> = ({ id, children }) => {
  const [, setDragging] = useGanttDragging();
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  const isPressed = Boolean(attributes['aria-pressed']);
  useEffect(() => setDragging(isPressed), [isPressed, setDragging]);
  return (
    <Card className="h-full w-full rounded-md bg-background p-2 text-xs shadow-sm">
      <div className={cn('flex h-full w-full items-center justify-between gap-2 text-left', isPressed && 'cursor-grabbing')} {...attributes} {...listeners} ref={setNodeRef}>
        {children}
      </div>
    </Card>
  );
};

export type GanttFeatureDragHelperProps = { featureId: GanttFeature['id']; direction: 'left' | 'right'; date: Date | null };
export const GanttFeatureDragHelper: FC<GanttFeatureDragHelperProps> = ({ direction, featureId, date }) => {
  const [, setDragging] = useGanttDragging();
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `feature-drag-helper-${featureId}` });
  const isPressed = Boolean(attributes['aria-pressed']);
  useEffect(() => setDragging(isPressed), [isPressed, setDragging]);
  return (
    <div className={cn('group -translate-y-1/2 !cursor-col-resize absolute top-1/2 z-[3] h-full w-6 rounded-md outline-none', direction === 'left' ? '-left-2.5' : '-right-2.5')} ref={setNodeRef} {...attributes} {...listeners}>
      <div className={cn('-translate-y-1/2 absolute top-1/2 h-[80%] w-1 rounded-sm bg-muted-foreground opacity-0 transition-all', direction === 'left' ? 'left-2.5' : 'right-2.5', direction === 'left' ? 'group-hover:left-0' : 'group-hover:right-0', isPressed && (direction === 'left' ? 'left-0' : 'right-0'), 'group-hover:opacity-100', isPressed && 'opacity-100')} />
      {date && (
        <div className={cn('-translate-x-1/2 absolute top-10 hidden whitespace-nowrap rounded-lg border border-border/50 bg-background/90 px-2 py-1 text-foreground text-xs backdrop-blur-lg group-hover:block', isPressed && 'block')}>
          {format(date, 'MMM dd, yyyy')}
        </div>
      )}
    </div>
  );
};

export type GanttFeatureItemProps = GanttFeature & { onMove?: (id: string, startDate: Date, endDate: Date | null) => void; children?: ReactNode; className?: string };
export const GanttFeatureItem: FC<GanttFeatureItemProps> = ({ onMove, children, className, ...feature }) => {
  const [scrollX] = useGanttScrollX();
  const gantt = useContext(GanttContext);
  const timelineStartDate = new Date(gantt.timelineData.at(0)?.year ?? 0, 0, 1);
  const [startAt, setStartAt] = useState<Date>(feature.startAt);
  const [endAt, setEndAt] = useState<Date | null>(feature.endAt);
  const width = Math.max(1, Math.round(getWidth(startAt, endAt, gantt)));
  const offset = Math.max(0, Math.round(getOffset(startAt, timelineStartDate, gantt)));
  const [mousePosition] = useMouse<HTMLDivElement>();
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 10 } });
  const handleItemDragStart = () => {};
  const handleItemDragMove = () => {};
  const onDragEnd = () => onMove?.(feature.id, startAt, endAt);
  const handleLeftDragMove = () => {
    const rect = gantt.ref?.current?.getBoundingClientRect();
    const x = mousePosition.x - (rect?.left ?? 0) + scrollX - gantt.sidebarWidth;
    const newStartAt = getDateByMousePosition(gantt, x);
    setStartAt(newStartAt);
  };
  const handleRightDragMove = () => {
    const rect = gantt.ref?.current?.getBoundingClientRect();
    const x = mousePosition.x - (rect?.left ?? 0) + scrollX - gantt.sidebarWidth;
    const newEndAt = getDateByMousePosition(gantt, x);
    setEndAt(newEndAt);
  };
  return (
    <div className={cn('relative flex w-max min-w-full py-0.5', className)} style={{ height: 'var(--gantt-row-height)' }}>
      <div className="pointer-events-auto absolute top-0.5" style={{ height: 'calc(var(--gantt-row-height) - 4px)', width, left: offset }}>
        {onMove && (
          <DndContext sensors={[mouseSensor]} modifiers={[restrictToHorizontalAxis]} onDragMove={handleLeftDragMove} onDragEnd={onDragEnd}>
            <GanttFeatureDragHelper direction="left" featureId={feature.id} date={startAt} />
          </DndContext>
        )}
        <DndContext sensors={[mouseSensor]} modifiers={[restrictToHorizontalAxis]} onDragStart={handleItemDragStart} onDragMove={handleItemDragMove} onDragEnd={onDragEnd}>
          <GanttFeatureItemCard id={feature.id}>{children ?? <p className="flex-1 truncate text-xs">{feature.name}</p>}</GanttFeatureItemCard>
        </DndContext>
        {onMove && (
          <DndContext sensors={[mouseSensor]} modifiers={[restrictToHorizontalAxis]} onDragMove={handleRightDragMove} onDragEnd={onDragEnd}>
            <GanttFeatureDragHelper direction="right" featureId={feature.id} date={endAt ?? addDays(startAt, 2)} />
          </DndContext>
        )}
      </div>
    </div>
  );
};

// Feature list containers
export type GanttFeatureListGroupProps = { children: ReactNode; className?: string };
export const GanttFeatureListGroup: FC<GanttFeatureListGroupProps> = ({ children, className }) => (
  <div className={className} style={{ paddingTop: 'var(--gantt-row-height)' }}>
    {children}
  </div>
);

export type GanttFeatureListProps = { className?: string; children: ReactNode };
export const GanttFeatureList: FC<GanttFeatureListProps> = ({ className, children }) => (
  <div className={cn('absolute top-0 left-0 h-full w-max space-y-4', className)} style={{ marginTop: 'var(--gantt-header-height)' }}>
    {children}
  </div>
);

// Markers
export const GanttMarker: FC<GanttMarkerProps & { onRemove?: (id: string) => void; className?: string }> = ({ label, date, id, onRemove, className }) => {
  const gantt = useContext(GanttContext);
  const diff = getDifferenceIn(gantt.range);
  const start = new Date(gantt.timelineData.at(0)?.year ?? 0, 0, 1);
  const offset = diff(date, start);
  const innerOffset = calculateInnerOffset(date, gantt.range, (gantt.columnWidth * gantt.zoom) / 100);
  const handleRemove = () => onRemove?.(id);
  return (
    <div className="pointer-events-none absolute top-0 left-0 z-20 flex h-full select-none flex-col items-center justify-center overflow-visible" style={{ width: 0, transform: `translateX(calc(var(--gantt-column-width) * ${offset} + ${innerOffset}px))` }}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className={cn('group pointer-events-auto sticky top-0 flex select-auto flex-col flex-nowrap items-center justify-center whitespace-nowrap rounded-b-md bg-card px-2 py-1 text-foreground text-xs', className)}>
            {label}
            <span className="max-h-[0] overflow-hidden opacity-80 transition-all group-hover:max-h-[2rem]">{format(date, 'MMM dd, yyyy')}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {onRemove ? (
            <ContextMenuItem className="flex items-center gap-2 text-destructive" onClick={handleRemove}>
              <TrashIcon size={16} />
              Remove marker
            </ContextMenuItem>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
      <div className={cn('h-full w-px bg-card', className)} />
    </div>
  );
};

export type GanttCreateMarkerTriggerProps = { onCreateMarker: (date: Date) => void; className?: string };
export const GanttCreateMarkerTrigger: FC<GanttCreateMarkerTriggerProps> = ({ onCreateMarker, className }) => {
  const gantt = useContext(GanttContext);
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();
  const [windowScroll] = useWindowScroll();
  const x = useThrottle(mousePosition.x - (mouseRef.current?.getBoundingClientRect().x ?? 0) - (windowScroll.x ?? 0), 10);
  const date = getDateByMousePosition(gantt, x);
  const handleClick = () => onCreateMarker(date);
  return (
    <div className={cn('group pointer-events-none absolute top-0 left-0 h-full w-full select-none overflow-visible', className)} ref={mouseRef}>
      <div className="-ml-2 pointer-events-auto sticky top-6 z-20 flex w-4 flex-col items-center justify-center gap-1 overflow-visible opacity-0 group-hover:opacity-100" style={{ transform: `translateX(${x}px)` }}>
        <button type="button" className="z-50 inline-flex h-4 w-4 items-center justify-center rounded-full bg-card" onClick={handleClick}>
          <PlusIcon size={12} className="text-muted-foreground" />
        </button>
        <div className="whitespace-nowrap rounded-full border border-border/50 bg-background/90 px-2 py-1 text-foreground text-xs backdrop-blur-lg">{format(date, 'MMM dd, yyyy')}</div>
      </div>
    </div>
  );
};

// Provider + containers
export type GanttProviderProps = { range?: Range; zoom?: number; onAddItem?: (date: Date) => void; children: ReactNode; className?: string };
export const GanttProvider: FC<GanttProviderProps> = ({ zoom = 100, range = 'monthly', onAddItem, children, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [timelineData, setTimelineData] = useState<TimelineData>(createInitialTimelineData(new Date()));
  const [, setScrollX] = useGanttScrollX();
  const headerHeight = 60; const rowHeight = 36;
  let columnWidth = 50; if (range === 'monthly') columnWidth = 150; else if (range === 'quarterly') columnWidth = 100;
  const sidebarElement = scrollRef.current?.querySelector('[data-roadmap-ui="gantt-sidebar"]');
  const sidebarWidth = sidebarElement ? 300 : 0;
  const cssVars = {
    '--gantt-zoom': `${zoom}`,
    '--gantt-column-width': `${(zoom / 100) * columnWidth}px`,
    '--gantt-header-height': `${headerHeight}px`,
    '--gantt-row-height': `${rowHeight}px`,
    '--gantt-sidebar-width': `${sidebarWidth}px`,
  } as CSSProperties;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth / 2 - scrollRef.current.clientWidth / 2;
      setScrollX(scrollRef.current.scrollLeft);
    }
  }, [range, zoom, setScrollX]);

  const handleScroll = useCallback(
    throttle(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setScrollX(scrollLeft);
      if (scrollLeft === 0) {
        const firstYear = timelineData[0]?.year; if (!firstYear) return;
        const copy: TimelineData = [...timelineData];
        copy.unshift({ year: firstYear - 1, quarters: new Array(4).fill(null).map((_, qi) => ({ months: new Array(3).fill(null).map((_, mi) => ({ days: getDaysInMonth(new Date(firstYear, qi * 3 + mi, 1)) })) })) });
        setTimelineData(copy);
        scrollRef.current.scrollLeft = scrollRef.current.clientWidth;
        setScrollX(scrollRef.current.scrollLeft);
      } else if (scrollLeft + clientWidth >= scrollWidth) {
        const lastYear = timelineData.at(-1)?.year; if (!lastYear) return;
        const copy: TimelineData = [...timelineData];
        copy.push({ year: lastYear + 1, quarters: new Array(4).fill(null).map((_, qi) => ({ months: new Array(3).fill(null).map((_, mi) => ({ days: getDaysInMonth(new Date(lastYear, qi * 3 + mi, 1)) })) })) });
        setTimelineData(copy);
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
        setScrollX(scrollRef.current.scrollLeft);
      }
    }, 100),
    [timelineData, setScrollX]
  );

  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => { el.removeEventListener('scroll', handleScroll) };
  }, [handleScroll]);

  return (
    <GanttContext.Provider value={{ zoom, range, headerHeight, columnWidth, sidebarWidth, rowHeight, onAddItem, timelineData, placeholderLength: 2, ref: scrollRef }}>
      <div className={cn('gantt relative grid h-full w-full flex-none select-none overflow-auto rounded-sm bg-secondary', range, className)} style={{ ...cssVars, gridTemplateColumns: 'var(--gantt-sidebar-width) 1fr' }} ref={scrollRef}>
        {children}
      </div>
    </GanttContext.Provider>
  );
};

export type GanttTimelineProps = { children: ReactNode; className?: string };
export const GanttTimeline: FC<GanttTimelineProps> = ({ children, className }) => (
  <div className={cn('relative flex h-full w-max flex-none overflow-clip', className)}>{children}</div>
);

export type GanttTodayProps = { className?: string };
export const GanttToday: FC<GanttTodayProps> = ({ className }) => {
  const label = 'Today'; const date = new Date();
  const gantt = useContext(GanttContext);
  const diff = getDifferenceIn(gantt.range);
  const start = new Date(gantt.timelineData.at(0)?.year ?? 0, 0, 1);
  const offset = diff(date, start);
  const innerOffset = calculateInnerOffset(date, gantt.range, (gantt.columnWidth * gantt.zoom) / 100);
  return (
    <div className="pointer-events-none absolute top-0 left-0 z-20 flex h-full select-none flex-col items-center justify-center overflow-visible" style={{ width: 0, transform: `translateX(calc(var(--gantt-column-width) * ${offset} + ${innerOffset}px))` }}>
      <div className={cn('group pointer-events-auto sticky top-0 flex select-auto flex-col flex-nowrap items-center justify-center whitespace-nowrap rounded-b-md bg-card px-2 py-1 text-foreground text-xs', className)}>
        {label}
        <span className="max-h-[0] overflow-hidden opacity-80 transition-all group-hover:max-h-[2rem]">{format(date, 'MMM dd, yyyy')}</span>
      </div>
      <div className={cn('h-full w-px bg-card', className)} />
    </div>
  );
};
