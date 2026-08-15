"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import * as d3 from "d3"
import type { Contact } from "@/lib/data"
import {
  buildNetworkGraph,
  buildNeighborMap,
  filterContactsByNameSearch,
} from "@/lib/network-graph-data"

type SimNode = ReturnType<typeof buildNetworkGraph>["nodes"][number] &
  d3.SimulationNodeDatum & {
    __dragMoved?: boolean
    __dragStartX?: number
    __dragStartY?: number
  }

type SimLink = Omit<ReturnType<typeof buildNetworkGraph>["links"][number], "source" | "target"> &
  d3.SimulationLinkDatum<SimNode>

type GraphElements = {
  linkSelection: d3.Selection<SVGLineElement, SimLink, SVGGElement, unknown>
  nodeSelection: d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>
  neighborMap: Map<string, Set<string>>
  backgroundRect: d3.Selection<SVGRectElement, unknown, null, undefined>
}

const FADED_OPACITY = 0.15
const LINK_OPACITY = 0.75
const DRAG_CLICK_DISTANCE = 20
// Keeps the force stepper running with lively ambient drift (alphaMin is 0.001).
const AMBIENT_ALPHA_TARGET = 0.09
const DRAG_ALPHA_TARGET = 0.45

function maintainSimulationEnergy(simulation: d3.Simulation<SimNode, SimLink>) {
  if (simulation.alpha() < AMBIENT_ALPHA_TARGET) {
    simulation.alphaTarget(AMBIENT_ALPHA_TARGET)
    simulation.alpha(AMBIENT_ALPHA_TARGET).restart()
  }
}

function returnSimulationToAmbient(simulation: d3.Simulation<SimNode, SimLink>) {
  simulation.alphaTarget(AMBIENT_ALPHA_TARGET)
  if (simulation.alpha() < AMBIENT_ALPHA_TARGET) {
    simulation.alpha(AMBIENT_ALPHA_TARGET).restart()
  }
}

function getNodeId(node: SimNode | string | number): string {
  return typeof node === "object" ? node.id : String(node)
}

function updateGraphPositions(graph: GraphElements) {
  graph.linkSelection
    .attr("x1", (link) => (link.source as SimNode).x ?? 0)
    .attr("y1", (link) => (link.source as SimNode).y ?? 0)
    .attr("x2", (link) => (link.target as SimNode).x ?? 0)
    .attr("y2", (link) => (link.target as SimNode).y ?? 0)

  graph.nodeSelection.attr(
    "transform",
    (node) => `translate(${node.x ?? 0},${node.y ?? 0})`,
  )
}

export function NetworkGraph({
  contacts,
  selectedId,
  onSelect,
}: {
  contacts: Contact[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)
  const graphRef = useRef<GraphElements | null>(null)
  const onSelectRef = useRef(onSelect)
  const selectedIdRef = useRef(selectedId)
  const hoveredNodeIdRef = useRef<string | null>(null)
  const searchFocusIdRef = useRef<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFocusId, setSearchFocusId] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  onSelectRef.current = onSelect
  selectedIdRef.current = selectedId
  searchFocusIdRef.current = searchFocusId
  hoveredNodeIdRef.current = hoveredNodeId

  // Create simulation and SVG once on mount. Never recreated by React state changes.
  useEffect(() => {
    const container = containerRef.current
    const svgElement = svgRef.current
    if (!container || !svgElement || contacts.length === 0) return

    const containerEl = container
    const { nodes, links } = buildNetworkGraph(contacts)
    const neighborMap = buildNeighborMap(links)
    const simNodes: SimNode[] = nodes.map((node) => ({ ...node }))
    const simLinks: SimLink[] = links.map((link) => ({ ...link }))

    let width = containerEl.clientWidth
    let height = containerEl.clientHeight
    const centerX = width / 2
    const centerY = height / 2
    const initialSpreadRadius = Math.min(width, height) * 0.12

    simNodes.forEach((node, index) => {
      const angle = (index / Math.max(simNodes.length, 1)) * Math.PI * 2
      node.x = centerX + Math.cos(angle) * initialSpreadRadius
      node.y = centerY + Math.sin(angle) * initialSpreadRadius
    })

    const svg = d3.select(svgElement)
    svg.selectAll("*").remove()

    const root = svg.append("g")

    const backgroundRect = root
      .append("rect")
      .attr("class", "network-graph-background")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .style("cursor", "default")
      .on("click", () => {
        setSearchFocusId(null)
        setHoveredNodeId(null)
        onSelectRef.current(null)
      })

    const linkGroup = root.append("g").attr("stroke-linecap", "round")
    const nodeGroup = root.append("g")

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .alphaDecay(0.03)
      .velocityDecay(0.4)
      .alphaTarget(AMBIENT_ALPHA_TARGET)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((node) => node.id)
          .distance(140),
      )
      .force("charge", d3.forceManyBody().strength(-150))
      .force("x", d3.forceX(centerX).strength(0.05))
      .force("y", d3.forceY(centerY).strength(0.05))
      .force(
        "collision",
        d3.forceCollide<SimNode>().radius((node) => node.radius + 24),
      )

    simulationRef.current = simulation

    const linkSelection = linkGroup
      .selectAll<SVGLineElement, SimLink>("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", "#444441")
      .attr("stroke-width", (link) => link.strokeWidth)
      .attr("stroke-opacity", LINK_OPACITY)
      .style("cursor", "default")
      .on("mouseenter", (event, link) => {
        const rect = containerEl.getBoundingClientRect()
        setTooltip({
          x: event.clientX - rect.left + 12,
          y: event.clientY - rect.top - 10,
          text: link.tooltip,
        })
      })
      .on("mousemove", (event, link) => {
        const rect = containerEl.getBoundingClientRect()
        setTooltip({
          x: event.clientX - rect.left + 12,
          y: event.clientY - rect.top - 10,
          text: link.tooltip,
        })
      })
      .on("mouseleave", () => setTooltip(null))

    const dragBehavior = d3
      .drag<SVGGElement, SimNode>()
      .clickDistance(DRAG_CLICK_DISTANCE)
      .filter((event) => event.button === 0)
      .on("start", (event, node) => {
        node.__dragMoved = false
        node.__dragStartX = event.x
        node.__dragStartY = event.y
      })
      .on("drag", (event, node) => {
        if (!node.__dragMoved) {
          const dx = event.x - (node.__dragStartX ?? event.x)
          const dy = event.y - (node.__dragStartY ?? event.y)
          if (dx * dx + dy * dy <= DRAG_CLICK_DISTANCE * DRAG_CLICK_DISTANCE) return

          node.__dragMoved = true
          node.fx = node.x
          node.fy = node.y
          if (!event.active) simulation.alphaTarget(DRAG_ALPHA_TARGET).restart()
        }
        node.fx = event.x
        node.fy = event.y
      })
      .on("end", (event, node) => {
        if (!node.__dragMoved) return
        node.fx = null
        node.fy = null
        if (!event.active) returnSimulationToAmbient(simulation)
      })

    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes, (node) => node.id)
      .join("g")
      .attr("class", "network-node")
      .style("cursor", "pointer")
      .call(dragBehavior)
      .on("click", (event, node) => {
        event.stopPropagation()
        setSearchFocusId(null)
        if (!node.__dragMoved) {
          maintainSimulationEnergy(simulation)
        }
        onSelectRef.current(node.id)
      })
      .on("mouseenter", (_event, node) => {
        if (!searchFocusIdRef.current) {
          setHoveredNodeId(node.id)
        }
      })
      .on("mouseleave", () => {
        if (!searchFocusIdRef.current) {
          setHoveredNodeId(null)
        }
      })

    nodeSelection
      .append("circle")
      .attr("class", "network-node-circle")
      .attr("r", (node) => node.radius)
      .style("fill", (node) => node.color)
      .attr("stroke", "transparent")
      .attr("stroke-width", 2)

    nodeSelection
      .append("circle")
      .attr("class", "network-node-selection-ring")
      .attr("r", (node) => node.radius + 4)
      .attr("fill", "none")
      .attr("stroke", "transparent")
      .attr("stroke-width", 2)
      .attr("pointer-events", "none")

    nodeSelection
      .append("text")
      .attr("class", "network-node-initials")
      .text((node) => node.initials)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "#ffffff")
      .attr("font-size", (node) => Math.max(11, node.radius * 0.36))
      .attr("font-weight", 600)
      .attr("pointer-events", "none")

    nodeSelection
      .append("text")
      .attr("class", "network-node-label")
      .text((node) => node.firstName)
      .attr("text-anchor", "middle")
      .attr("y", (node) => node.radius + 14)
      .attr("fill", "#444441")
      .attr("font-size", 11)
      .attr("pointer-events", "none")

    graphRef.current = {
      linkSelection,
      nodeSelection,
      neighborMap,
      backgroundRect,
    }

    simulation.on("tick", () => {
      const currentGraph = graphRef.current
      if (!currentGraph) return
      updateGraphPositions(currentGraph)
    })

    function handleResize() {
      width = containerEl.clientWidth
      height = containerEl.clientHeight
      backgroundRect.attr("width", width).attr("height", height)
      simulation.force("x", d3.forceX(width / 2).strength(0.05))
      simulation.force("y", d3.forceY(height / 2).strength(0.05))
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerEl)

    return () => {
      resizeObserver.disconnect()
      simulation.on("tick", null)
      simulation.stop()
      simulationRef.current = null
      graphRef.current = null
      setTooltip(null)
    }
  }, [])

  // Selection and focus styling only — never touches the simulation.
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    const { linkSelection, nodeSelection, neighborMap } = graph
    const focusId = searchFocusId ?? hoveredNodeId ?? selectedId

    nodeSelection.select(".network-node-circle").attr("stroke", (node) => {
      if (hoveredNodeId && node.id === hoveredNodeId && node.id !== selectedId) {
        return "#b0b0ad"
      }
      return "transparent"
    })

    nodeSelection.select(".network-node-selection-ring").attr("stroke", (node) => {
      if (selectedId && node.id === selectedId) return "#1a1a1a"
      return "transparent"
    })

    if (!focusId) {
      nodeSelection.style("opacity", 1)
      linkSelection.attr("stroke-opacity", LINK_OPACITY)
      return
    }

    const visibleNodes = new Set<string>([focusId])
    const neighbors = neighborMap.get(focusId)
    neighbors?.forEach((neighborId) => visibleNodes.add(neighborId))

    nodeSelection.style("opacity", (node) =>
      visibleNodes.has(node.id) ? 1 : FADED_OPACITY,
    )

    linkSelection.attr("stroke-opacity", (link) => {
      const sourceId = getNodeId(link.source)
      const targetId = getNodeId(link.target)
      const isIncident = sourceId === focusId || targetId === focusId
      return isIncident ? LINK_OPACITY : FADED_OPACITY
    })
  }, [searchFocusId, selectedId, hoveredNodeId])

  if (contacts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-white text-[13px] text-muted-foreground">
        Add contacts to see your network graph.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-white"
      style={{
        backgroundImage: "radial-gradient(circle, #e8e8e6 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <NetworkSearchAutocomplete
        contacts={contacts}
        searchQuery={searchQuery}
        searchFocusId={searchFocusId}
        dropdownOpen={dropdownOpen}
        onSearchQueryChange={(value) => {
          setSearchQuery(value)
          setSearchFocusId(null)
          setHoveredNodeId(null)
          setDropdownOpen(value.trim().length > 0)
        }}
        onDropdownOpenChange={setDropdownOpen}
        onSelectContact={(contact) => {
          setSearchQuery(contact.name)
          setSearchFocusId(contact.id)
          setDropdownOpen(false)
          setHoveredNodeId(null)
          onSelect(contact.id)
        }}
        onClear={() => {
          setSearchQuery("")
          setSearchFocusId(null)
          setDropdownOpen(false)
          setHoveredNodeId(null)
          onSelect(null)
        }}
      />

      <svg ref={svgRef} className="h-full w-full" aria-label="Contact network graph" />

      {tooltip ? (
        <div
          className="pointer-events-none absolute z-10 max-w-[220px] rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] leading-snug text-foreground shadow-sm"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      ) : null}

      <NetworkLegend />
    </div>
  )
}

function NetworkSearchAutocomplete({
  contacts,
  searchQuery,
  searchFocusId,
  dropdownOpen,
  onSearchQueryChange,
  onDropdownOpenChange,
  onSelectContact,
  onClear,
}: {
  contacts: Contact[]
  searchQuery: string
  searchFocusId: string | null
  dropdownOpen: boolean
  onSearchQueryChange: (value: string) => void
  onDropdownOpenChange: (open: boolean) => void
  onSelectContact: (contact: Contact) => void
  onClear: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const results = filterContactsByNameSearch(searchQuery, contacts)
  const showDropdown = dropdownOpen && searchQuery.trim().length > 0
  const showClearButton = searchQuery.length > 0 || searchFocusId !== null

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onDropdownOpenChange(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onDropdownOpenChange])

  return (
    <div ref={containerRef} className="absolute left-4 top-4 z-10 w-64">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          onFocus={() => {
            if (searchQuery.trim()) onDropdownOpenChange(true)
          }}
          placeholder="Search by name..."
          className="w-full rounded-md border border-border bg-white py-1.5 pl-3 pr-8 text-[12px] text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          style={{ borderWidth: "0.5px" }}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="network-search-results"
          aria-autocomplete="list"
        />

        {showClearButton ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div
          id="network-search-results"
          role="listbox"
          className="absolute top-[calc(100%+4px)] w-full overflow-hidden rounded-md bg-white shadow-sm"
          style={{ border: "0.5px solid var(--border)" }}
        >
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-[12px] text-muted-foreground">No contacts found</p>
          ) : (
            <ul>
              {results.map((contact) => (
                <li key={contact.id} role="option">
                  <button
                    type="button"
                    onClick={() => onSelectContact(contact)}
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-muted/60"
                  >
                    <span className="text-[12px] font-medium text-foreground">{contact.name}</span>
                    <span className="text-[11px] text-muted-foreground">{contact.company}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

function NetworkLegend() {
  return (
    <div className="absolute bottom-4 left-4 rounded-lg border border-border bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-sm">
      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        How to read this.
      </p>

      <p className="mb-1.5 text-[10px] font-medium text-foreground">Connection type</p>
      <div className="flex flex-col gap-1.5">
        <LegendRow color="#EF9F27" label="Hot" />
        <LegendRow color="#639922" label="Warm" />
        <LegendRow color="#888780" label="Cold" />
      </div>

      <div className="my-2.5 border-t border-border" />

      <p className="mb-1.5 text-[10px] font-medium text-foreground">Shared background</p>
      <div className="flex flex-col gap-1.5">
        <LegendLine width={2.5} label="Same company" />
        <LegendLine width={1.5} label="Same university" />
      </div>
    </div>
  )
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[11px] text-foreground">{label}</span>
    </div>
  )
}

function LegendLine({ width, label }: { width: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-8 rounded-full"
        style={{ height: width, backgroundColor: "#444441" }}
      />
      <span className="text-[11px] text-foreground">{label}</span>
    </div>
  )
}
