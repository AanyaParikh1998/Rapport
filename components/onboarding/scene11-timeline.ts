/** Calendar integration scene — both cards visible from start (seconds) */
export const S11_CARD_MOVE_S = 0.8

export const S11_START_HOLD = 1

/* Example 1: James — upcoming call */
export const S11_EX1_BANNER_IN = S11_START_HOLD
export const S11_EX1_BANNER_HOLD = 2
export const S11_EX1_CURSOR = S11_EX1_BANNER_IN + 0.35 + S11_EX1_BANNER_HOLD
export const S11_EX1_CONFIRM_HOVER = S11_EX1_CURSOR + 0.4
export const S11_EX1_CONFIRM_CLICK = S11_EX1_CONFIRM_HOVER + 0.5
export const S11_EX1_BANNER_OUT = S11_EX1_CONFIRM_CLICK + 0.15
export const S11_EX1_JAMES_MOVE = S11_EX1_BANNER_OUT + 0.35
export const S11_EX1_JAMES_BORDER = S11_EX1_JAMES_MOVE + S11_CARD_MOVE_S
export const S11_EX1_HOLD_END = S11_EX1_JAMES_BORDER + 1.5

/* Example 2: Priya — past call */
export const S11_EX2_BANNER_IN = S11_EX1_HOLD_END
export const S11_EX2_BANNER_HOLD = 2
export const S11_EX2_CURSOR = S11_EX2_BANNER_IN + 0.35 + S11_EX2_BANNER_HOLD
export const S11_EX2_CONFIRM_HOVER = S11_EX2_CURSOR + 0.4
export const S11_EX2_CONFIRM_CLICK = S11_EX2_CONFIRM_HOVER + 0.5
export const S11_EX2_BANNER_OUT = S11_EX2_CONFIRM_CLICK + 0.15
export const S11_EX2_PRIYA_MOVE = S11_EX2_BANNER_OUT + 0.35
export const S11_EX2_PRIYA_BORDER = S11_EX2_PRIYA_MOVE + S11_CARD_MOVE_S
export const S11_EX2_PRIYA_CHECK_OUT = S11_EX2_PRIYA_BORDER + 0.5
export const S11_EX2_HOLD_END = S11_EX2_PRIYA_CHECK_OUT + 1.5

export const S11_DURATION_S = S11_EX2_HOLD_END + 0.5
export const S11_DURATION_MS = Math.round(S11_DURATION_S * 1000)
