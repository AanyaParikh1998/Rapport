import { OB_USER } from "@/components/onboarding/persona"

/** Create your profile scene — timeline in seconds (see onboarding.css .ob-s3-* rules) */
export const S3_CHAR_MS = 0.07

const typingDuration = (text: string, charMs: number) => text.length * charMs

const PAUSE = 2
const OVERLAY = 0.5
const MODAL_IN = 0.35
const CARET = 0.5
const HOVER = 0.5
const SAVE = 0.4
const CARD_IN = 0.25
const FADE = 0.5

let t = 1

const p1Click = (t += HOVER)
const p1Modal = p1Click + OVERLAY
const p1NameType = p1Modal + MODAL_IN + CARET
const p1StyleType = p1NameType + typingDuration(OB_USER.voiceProfile, S3_CHAR_MS) + CARET
const p1StyleEnd = p1StyleType + typingDuration(OB_USER.styleInstructions, S3_CHAR_MS)
const p1Save = p1StyleEnd + HOVER
const p1Card = p1Save + SAVE + CARD_IN
const p1HoldEnd = p1Card + PAUSE

const p2Click = p1HoldEnd + HOVER
const p2Modal = p2Click + OVERLAY
const p2NameType = p2Modal + MODAL_IN + CARET
const p2StyleType = p2NameType + typingDuration(OB_USER.secondaryVoiceProfile, S3_CHAR_MS) + CARET
const p2StyleEnd = p2StyleType + typingDuration(OB_USER.secondaryStyleInstructions, S3_CHAR_MS)
const p2Save = p2StyleEnd + HOVER
const p2Card = p2Save + SAVE + CARD_IN
const p2HoldEnd = p2Card + PAUSE

export const S3_DURATION_S = p2HoldEnd + FADE
export const S3_DURATION_MS = Math.round(S3_DURATION_S * 1000)

export const S3_P1 = {
  click: p1Click,
  modalStart: p1Modal,
  nameTypeStart: p1NameType,
  styleTypeStart: p1StyleType,
  saveClick: p1Save + SAVE,
  cardIn: p1Card,
  holdEnd: p1HoldEnd,
} as const

export const S3_P2 = {
  click: p2Click,
  modalStart: p2Modal,
  nameTypeStart: p2NameType,
  styleTypeStart: p2StyleType,
  saveClick: p2Save + SAVE,
  cardIn: p2Card,
  holdEnd: p2HoldEnd,
} as const
