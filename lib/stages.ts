import type { Stage } from "@/lib/data"

export const STAGE_LEFT_BORDER: Record<Stage, string> = {
  not_contacted: "border-l-[#888780]",
  in_progress: "border-l-[#378ADD]",
  responded: "border-l-[#EF9F27]",
  met_connected: "border-l-[#639922]",
}

const LEGACY_STAGE_MAP: Record<string, Stage> = {
  drafted: "not_contacted",
  sent: "in_progress",
}

export function normalizeStage(status: string): Stage {
  if (status in LEGACY_STAGE_MAP) {
    return LEGACY_STAGE_MAP[status]
  }

  if (
    status === "not_contacted" ||
    status === "in_progress" ||
    status === "responded" ||
    status === "met_connected"
  ) {
    return status
  }

  return "not_contacted"
}

export function getStageLabelPrefix(stage: Stage): string {
  switch (stage) {
    case "in_progress":
      return "In progress"
    case "responded":
      return "Responded"
    case "met_connected":
      return "Met / Connected"
    default:
      return "Added"
  }
}

export function getStageDisplayLabel(stage: Stage): string {
  switch (stage) {
    case "not_contacted":
      return "Not contacted"
    case "in_progress":
      return "In progress"
    case "responded":
      return "Responded"
    case "met_connected":
      return "Met / Connected"
  }
}

export function getStageChangeLogDescription(stage: Stage): string {
  switch (stage) {
    case "not_contacted":
      return "Moved to Not contacted"
    case "in_progress":
      return "Moved to In progress"
    case "responded":
      return "Moved to Responded"
    case "met_connected":
      return "Moved to Met / Connected"
  }
}

export function getStageScorePoints(stage: Stage): number {
  switch (stage) {
    case "met_connected":
      return 30
    case "responded":
      return 20
    case "in_progress":
      return 10
    case "not_contacted":
      return 0
  }
}

export function isSuccessfulOutreachStage(stage: Stage): boolean {
  return stage === "responded" || stage === "met_connected"
}
