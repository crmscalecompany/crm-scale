"use client";

import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export interface KanbanColumnDef {
  key: string;
  label: string;
}

interface KanbanBoardProps<T extends { id: string; status: string }> {
  columns: KanbanColumnDef[];
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  onMove: (itemId: string, newStatus: string) => void;
  /** Which column an item belongs in — defaults to `item.status`. Boards
   * whose columns aren't a 1:1 read of a single status field (e.g. the
   * Closer's pipeline board, which splits "em_negociacao" into
   * Agendado/No Show/Em Negociação based on the deal's meeting) pass a
   * derived key instead. `onMove`'s target is still just the column's
   * `key` string — what "moving to" a given column means is entirely up
   * to the caller. */
  groupKey?: (item: T) => string;
}

function DraggableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 30 : undefined,
        position: "relative" as const,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none">
      {children}
    </div>
  );
}

function DroppableColumn({ id, label, count, children }: { id: string; label: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex max-h-[75vh] w-[280px] shrink-0 flex-col gap-3 rounded-card border p-3 transition-colors sm:w-72",
        isOver ? "border-accent-primary/60 bg-accent-primary/5" : "border-hairline bg-bg-secondary/40"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-primary">{label}</h3>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-secondary">{count}</span>
      </div>
      {/* Each column scrolls independently — without this, a column with
       * many cards stretches the whole board's height instead of just
       * scrolling in place (min-h-[60px] keeps empty columns from
       * collapsing to nothing as drop targets). */}
      <div className="flex min-h-[60px] flex-1 flex-col gap-2 overflow-y-auto">{children}</div>
    </div>
  );
}

// Column-to-column drag and drop (no in-column reordering) — enough for the
// Week 2 kanban. activationConstraint keeps a plain tap/click on a card's
// buttons (claim, qualify) from being swallowed as a drag gesture.
export function KanbanBoard<T extends { id: string; status: string }>({
  columns,
  items,
  renderCard,
  onMove,
  groupKey = (item) => item.status,
}: KanbanBoardProps<T>) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const itemId = String(active.id);
    const newStatus = String(over.id);
    const item = items.find((i) => i.id === itemId);
    if (!item || groupKey(item) === newStatus) return;
    onMove(itemId, newStatus);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colItems = items.filter((i) => groupKey(i) === col.key);
          return (
            <DroppableColumn key={col.key} id={col.key} label={col.label} count={colItems.length}>
              {colItems.map((item) => (
                <DraggableCard key={item.id} id={item.id}>
                  {renderCard(item)}
                </DraggableCard>
              ))}
            </DroppableColumn>
          );
        })}
      </div>
    </DndContext>
  );
}
