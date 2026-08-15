import { OB_USER } from "@/components/onboarding/persona"

export const S3_CHAR_MS = 0.07
export const S3_EMAIL_LABEL_MS = 0.07
export const S3_EMAIL_BODY_MS = 0.035

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
const CAPTION = 2
const SUMMARY_HOLD = 2.5

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

export const S3_PROFILES_VIEW_END = p2HoldEnd + FADE

const eAddClick = S3_PROFILES_VIEW_END + FADE + HOVER
const eModal = eAddClick + OVERLAY
const eLabelType = eModal + MODAL_IN + CARET
const eBodyType =
  eLabelType + typingDuration(OB_USER.emailSampleLabel, S3_EMAIL_LABEL_MS) + 0.3
const eBodyEnd = eBodyType + typingDuration(OB_USER.sampleEmail, S3_EMAIL_BODY_MS)
const eDropdownFocus = eBodyEnd + 0.5
const eDropdownOpen = eDropdownFocus + 0.3
const eDropdownSelect = eDropdownOpen + DROPDOWN_HOLD
const eDropdownClose = eDropdownSelect + DROPDOWN_SELECT
const eSavePulse = eDropdownClose + 0.2
const eSaveClick = eSavePulse + SAVE_PULSE
const eCard = eSaveClick + SAVE + CARD_IN
const eHoldEnd = eCard + PAUSE

export const S3_CAPTION_LINKEDIN_START = eHoldEnd
export const S3_CAPTION_LINKEDIN_END = eHoldEnd + CAPTION

export const S3_SUMMARY_START = S3_CAPTION_LINKEDIN_END + FADE
export const S3_DURATION_S = S3_SUMMARY_START + SUMMARY_HOLD
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

export const S3_EMAIL = {
  viewStart: S3_PROFILES_VIEW_END,
  addClick: eAddClick,
  modalStart: eModal,
  labelTypeStart: eLabelType,
  bodyTypeStart: eBodyType,
  dropdownFocus: eDropdownFocus,
  dropdownOpen: eDropdownOpen,
  dropdownSelect: eDropdownSelect,
  dropdownClose: eDropdownClose,
  savePulseStart: eSavePulse,
  saveClick: eSaveClick,
  cardIn: eCard,
  holdEnd: eHoldEnd,
} as const

export const S3_STEPS = {
  voice: { start: 0, end: S3_PROFILES_VIEW_END, label: "Creating your voice profile" },
  email: { start: S3_PROFILES_VIEW_END, end: S3_CAPTION_LINKEDIN_START, label: "Adding an email sample" },
} as const

export const S3_CAPTION_MID_MS = Math.round(p2Card * 1000)
export const S3_CAPTION_FINAL_MS = Math.round(S3_SUMMARY_START * 1000)

export const S3_CSS = {
  profilesViewEnd: S3_PROFILES_VIEW_END,
  p1Card,
  p2Card,
  p1SaveClick: p1Save + SAVE,
  p2SaveClick: p2Save + SAVE,
  p1StyleEnd,
  p2StyleEnd,
  eAddClick,
  eModal,
  eSaveClick,
  eBodyEnd,
  eDropdownFocus,
  eDropdownOpen,
  eDropdownSelect,
  eDropdownClose,
  eSavePulse,
  eCard,
  captionStart: S3_CAPTION_LINKEDIN_START,
  captionEnd: S3_CAPTION_LINKEDIN_END,
  summaryStart: S3_SUMMARY_START,
  duration: S3_DURATION_S,
} as const
