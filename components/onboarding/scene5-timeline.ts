const CURSOR_MOVE = 0.4
const MENU_OPEN = 0.2
const MENU_HOLD = 1.5
const CURSOR_TO_OPT = 0.4
const HOVER = 0.5
const CLICK = 0.1
const MENU_CLOSE = 0.2
const POST_HOLD = 0.8

const MANUAL_START = 10.0

export const S5_EMAIL_TEXT = "j.smith@accenture.com"
export const S5_EMAIL_CHAR_MS = 0.05
const S5_EMAIL_TYPING_DURATION = S5_EMAIL_TEXT.length * S5_EMAIL_CHAR_MS

function dropdownTimings(start: number) {
  const cursorIn = start
  const focusOpen = cursorIn + CURSOR_MOVE
  const menuHoldEnd = focusOpen + MENU_HOLD
  const cursorOnOpt = menuHoldEnd + CURSOR_TO_OPT
  const hoverEnd = cursorOnOpt + HOVER
  const click = hoverEnd
  const close = click + CLICK
  const valueIn = close + MENU_CLOSE
  const done = valueIn + POST_HOLD
  return {
    cursorIn,
    focusOpen,
    menuOpen: focusOpen,
    menuHoldEnd,
    cursorOnOpt,
    hoverEnd,
    click,
    close: valueIn,
    valueIn,
    done,
  }
}

export const S5_GOAL = dropdownTimings(MANUAL_START)
export const S5_SOURCE = dropdownTimings(S5_GOAL.done)
export const S5_TYPE = dropdownTimings(S5_SOURCE.done)

export const S5_EMAIL_START = S5_TYPE.done
export const S5_EMAIL_CURSOR = S5_EMAIL_START + CURSOR_MOVE
export const S5_EMAIL_TYPING_START = S5_EMAIL_CURSOR
export const S5_EMAIL_TYPING_END = S5_EMAIL_TYPING_START + S5_EMAIL_TYPING_DURATION
export const S5_EMAIL_DONE = S5_EMAIL_TYPING_END + POST_HOLD

export const S5_SAVE_APPEAR = S5_EMAIL_DONE
export const S5_SAVE_CURSOR = S5_SAVE_APPEAR + 0.3
export const S5_SAVE_PULSE = S5_SAVE_CURSOR + CURSOR_MOVE + 0.5
export const S5_SAVE_CLICK = S5_SAVE_PULSE + 0.5
export const S5_SAVED = S5_SAVE_CLICK + 0.4
export const S5_KANBAN = S5_SAVED + 0.5

export const S5_DURATION_S = S5_KANBAN + 1.0
export const S5_DURATION_MS = Math.round(S5_DURATION_S * 1000)

export const S5_CSS = {
  manualStart: MANUAL_START,
  goal: S5_GOAL,
  source: S5_SOURCE,
  type: S5_TYPE,
  email: {
    start: S5_EMAIL_START,
    cursor: S5_EMAIL_CURSOR,
    typingStart: S5_EMAIL_TYPING_START,
    typingEnd: S5_EMAIL_TYPING_END,
    done: S5_EMAIL_DONE,
  },
  saveCursor: S5_SAVE_CURSOR,
  savePulse: S5_SAVE_PULSE,
  saveClick: S5_SAVE_CLICK,
  saved: S5_SAVED,
  kanban: S5_KANBAN,
  duration: S5_DURATION_S,
} as const
