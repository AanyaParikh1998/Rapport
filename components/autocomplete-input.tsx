"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"

const MAX_SUGGESTIONS = 8

export function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  className: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase()
    const matches = query
      ? options.filter((option) => option.toLowerCase().includes(query))
      : options
    return matches.slice(0, MAX_SUGGESTIONS)
  }, [value, options])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [value, isOpen])

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [isOpen])

  function selectOption(option: string) {
    onChange(option)
    setIsOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (event.key === "ArrowDown") setIsOpen(true)
      return
    }

    if (filtered.length === 0) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setHighlightedIndex((index) => Math.min(index + 1, filtered.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setHighlightedIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === "Enter") {
      event.preventDefault()
      selectOption(filtered[highlightedIndex])
    } else if (event.key === "Escape") {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {isOpen && filtered.length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-48 overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-md">
          {filtered.map((option, index) => (
            <button
              key={option}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault()
                selectOption(option)
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                "block w-full truncate px-3 py-1.5 text-left text-[13px] text-popover-foreground",
                index === highlightedIndex && "bg-muted",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
