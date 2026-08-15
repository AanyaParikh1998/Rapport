"use client"

import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { STAGES, type Contact, type Stage } from "@/lib/data"
import { ContactCard } from "@/components/contact-card"

const STAGE_IDS = new Set(STAGES.map((stage) => stage.id))

export function KanbanBoard({
  contacts,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onMove,
  calendarBannerContactIds,
}: {
  contacts: Contact[]
  selectedId: string | null
  onSelect: (id: string) => void
  onEdit: (contact: Contact) => void
  onDelete: (id: string) => Promise<void>
  onMove: (id: string, stage: Stage) => void
  calendarBannerContactIds?: Set<string>
}) {
  const [activeContact, setActiveContact] = useState<Contact | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  function resolveStage(overId: string): Stage | null {
    if (STAGE_IDS.has(overId as Stage)) {
      return overId as Stage
    }

    const contact = contacts.find((item) => item.id === overId)
    return contact?.stage ?? null
  }

  function handleDragStart(event: DragStartEvent) {
    const contact = contacts.find((item) => item.id === event.active.id)
    setActiveContact(contact ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveContact(null)

    const { active, over } = event
    if (!over) return

    const contactId = String(active.id)
    const newStage = resolveStage(String(over.id))
    if (!newStage) return

    const contact = contacts.find((item) => item.id === contactId)
    if (!contact || contact.stage === newStage) return

    onMove(contactId, newStage)
  }

  function handleDragCancel() {
    setActiveContact(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid h-full grid-cols-4 gap-4 p-5">
        {STAGES.map((stage) => {
          const items = contacts.filter((contact) => contact.stage === stage.id)

          return (
            <KanbanColumn key={stage.id} stageId={stage.id} label={stage.label} count={items.length}>
              {items.map((contact) => (
                <DraggableContactCard
                  key={contact.id}
                  contact={contact}
                  contacts={contacts}
                  selected={selectedId === contact.id}
                  onSelect={() => onSelect(contact.id)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  calendarBannerContactIds={calendarBannerContactIds}
                />
              ))}
            </KanbanColumn>
          )
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeContact ? (
          <div className="rotate-1 cursor-grabbing opacity-95 shadow-lg">
            <ContactCard
              contact={activeContact}
              contacts={contacts}
              selected={selectedId === activeContact.id}
              onSelect={() => {}}
              onEdit={() => {}}
              onDelete={async () => {}}
              dragOverlay
              calendarBannerContactIds={calendarBannerContactIds}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({
  stageId,
  label,
  count,
  children,
}: {
  stageId: Stage
  label: string
  count: number
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId })

  return (
    <section className="flex min-w-0 flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </h2>
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium text-muted-foreground">
          {count}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[240px] flex-col gap-2.5 rounded-lg p-1 transition-colors",
          isOver && "bg-primary/5 ring-1 ring-primary/20 ring-inset",
        )}
      >
        {children}
        {count === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
            No contacts
          </p>
        ) : null}
      </div>
    </section>
  )
}

function DraggableContactCard({
  contact,
  contacts,
  selected,
  onSelect,
  onEdit,
  onDelete,
  calendarBannerContactIds,
}: {
  contact: Contact
  contacts: Contact[]
  selected: boolean
  onSelect: () => void
  onEdit: (contact: Contact) => void
  onDelete: (id: string) => Promise<void>
  calendarBannerContactIds?: Set<string>
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: contact.id,
  })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      id={`contact-card-${contact.id}`}
      style={style}
      className={cn("touch-none", isDragging && "opacity-40")}
      {...listeners}
      {...attributes}
    >
      <ContactCard
        contact={contact}
        contacts={contacts}
        selected={selected}
        onSelect={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
        calendarBannerContactIds={calendarBannerContactIds}
      />
    </div>
  )
}
