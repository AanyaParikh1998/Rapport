import { OB_USER } from "@/components/onboarding/persona"

/** My Voice scene — timeline in seconds (see onboarding.css .ob-s4-* rules) */
export const S4_EMAIL_LABEL_MS = 0.07
export const S4_LINKEDIN_LABEL_MS = 0.07

const typingDuration = (text: string, charMs: number) => text.length * charMs

const PAUSE = 2
const OVERLAY = 0.5
const MODAL_IN = 0.35
const CARET = 0.5
const HOVER = 0.5
const SAVE = 0.4
const CARD_IN = 0.25
const FADE = 0.5
const DROPDOWN_HOLD = 1.5
const DROPDOWN_SELECT = 0.4
const SAVE_PULSE = 0.5

let t = 1

// Email sample — label types, then a copy-from-sent-message → paste sequence
const eAddClick = (t += HOVER)
const eModal = eAddClick + OVERLAY
const eLabelType = eModal + MODAL_IN + CARET
const eLabelEnd = eLabelType + typingDuration(OB_USER.emailSampleLabel, S4_EMAIL_LABEL_MS)

const eCopyStart = eLabelEnd + 0.3
const eKbdAHoldEnd = eCopyStart + 1.2
const eKbdCHoldEnd = eCopyStart + 2.2
const eKbdVStart = eKbdCHoldEnd + 0.2
const ePasteReveal = eKbdVStart + 0.2
const eKbdVEnd = eKbdVStart + 1.0
const eBodyEnd = eKbdVEnd + 0.2

const eDropdownFocus = eBodyEnd + 0.5
const eDropdownOpen = eDropdownFocus + 0.3
const eDropdownSelect = eDropdownOpen + DROPDOWN_HOLD
const eDropdownClose = eDropdownSelect + DROPDOWN_SELECT
const eSavePulse = eDropdownClose + 0.2
const eSaveClick = eSavePulse + SAVE_PULSE
const eCard = eSaveClick + SAVE + CARD_IN
const eHoldEnd = eCard + PAUSE

export const S4_EMAIL_VIEW_END = eHoldEnd + FADE

// LinkedIn sample (mirrors the email sequence)
const liAddClick = S4_EMAIL_VIEW_END + FADE + HOVER
const liModal = liAddClick + OVERLAY
const liLabelType = liModal + MODAL_IN + CARET
const liLabelEnd = liLabelType + typingDuration(OB_USER.linkedinSampleLabel, S4_LINKEDIN_LABEL_MS)

const liCopyStart = liLabelEnd + 0.3
const liKbdAHoldEnd = liCopyStart + 1.2
const liKbdCHoldEnd = liCopyStart + 2.2
const liKbdVStart = liKbdCHoldEnd + 0.2
const liPasteReveal = liKbdVStart + 0.2
const liKbdVEnd = liKbdVStart + 1.0
const liBodyEnd = liKbdVEnd + 0.2

const liDropdownFocus = liBodyEnd + 0.5
const liDropdownOpen = liDropdownFocus + 0.3
const liDropdownSelect = liDropdownOpen + DROPDOWN_HOLD
const liDropdownClose = liDropdownSelect + DROPDOWN_SELECT
const liSavePulse = liDropdownClose + 0.2
const liSaveClick = liSavePulse + SAVE_PULSE
const liCard = liSaveClick + SAVE + CARD_IN
const liHoldEnd = liCard + PAUSE

export const S4_DURATION_S = liHoldEnd + PAUSE
export const S4_DURATION_MS = Math.round(S4_DURATION_S * 1000)

export const S4_EMAIL = {
  addClick: eAddClick,
  modalStart: eModal,
  labelTypeStart: eLabelType,
  labelEnd: eLabelEnd,
  copyStart: eCopyStart,
  kbdAHoldEnd: eKbdAHoldEnd,
  kbdCHoldEnd: eKbdCHoldEnd,
  kbdVStart: eKbdVStart,
  pasteReveal: ePasteReveal,
  kbdVEnd: eKbdVEnd,
  bodyEnd: eBodyEnd,
  dropdownFocus: eDropdownFocus,
  dropdownOpen: eDropdownOpen,
  dropdownSelect: eDropdownSelect,
  dropdownClose: eDropdownClose,
  savePulseStart: eSavePulse,
  saveClick: eSaveClick,
  cardIn: eCard,
  holdEnd: eHoldEnd,
} as const

export const S4_LINKEDIN = {
  viewStart: S4_EMAIL_VIEW_END,
  addClick: liAddClick,
  modalStart: liModal,
  labelTypeStart: liLabelType,
  labelEnd: liLabelEnd,
  copyStart: liCopyStart,
  kbdAHoldEnd: liKbdAHoldEnd,
  kbdCHoldEnd: liKbdCHoldEnd,
  kbdVStart: liKbdVStart,
  pasteReveal: liPasteReveal,
  kbdVEnd: liKbdVEnd,
  bodyEnd: liBodyEnd,
  dropdownFocus: liDropdownFocus,
  dropdownOpen: liDropdownOpen,
  dropdownSelect: liDropdownSelect,
  dropdownClose: liDropdownClose,
  savePulseStart: liSavePulse,
  saveClick: liSaveClick,
  cardIn: liCard,
  holdEnd: liHoldEnd,
} as const
