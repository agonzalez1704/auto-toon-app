/**
 * Pure layout solver — masonry packing with predefined col/row spans.
 * No React, no side effects. Unit-testable.
 */

export interface SlotLayout {
  x: number
  y: number
  w: number
  h: number
}

export interface MasonryConfig {
  cellSize: number
  gap: number
  cols: number
  /** sequence of [colSpan, rowSpan] cycled to assign tile shapes */
  spans: ReadonlyArray<readonly [number, number]>
}

export const DEFAULT_SPANS: ReadonlyArray<readonly [number, number]> = [
  [2, 2],
  [1, 1],
  [1, 1],
  [1, 2],
  [1, 1],
  [1, 1],
  [2, 1],
  [1, 1],
  [1, 2],
  [1, 1],
  [1, 1],
  [2, 1],
]

export function computeMasonryLayout(
  count: number,
  config: MasonryConfig
): { slots: SlotLayout[]; totalHeight: number } {
  const { cellSize, gap, cols, spans } = config
  const rowHeight = cellSize
  const grid: boolean[][] = []
  const ensureRow = (r: number) => {
    while (grid.length <= r) grid.push(new Array(cols).fill(false))
  }
  const slots: SlotLayout[] = []

  for (let i = 0; i < count; i++) {
    const [cs, rs] = spans[i % spans.length]
    const colSpan = Math.min(cs, cols)
    const rowSpan = rs
    let foundR = -1
    let foundC = -1
    outer: for (let r = 0; ; r++) {
      ensureRow(r + rowSpan - 1)
      for (let c = 0; c <= cols - colSpan; c++) {
        let fits = true
        for (let dr = 0; dr < rowSpan && fits; dr++) {
          for (let dc = 0; dc < colSpan && fits; dc++) {
            if (grid[r + dr][c + dc]) fits = false
          }
        }
        if (fits) {
          foundR = r
          foundC = c
          break outer
        }
      }
      if (r > 50) break
    }
    if (foundR < 0) continue
    for (let dr = 0; dr < rowSpan; dr++) {
      for (let dc = 0; dc < colSpan; dc++) {
        grid[foundR + dr][foundC + dc] = true
      }
    }
    slots.push({
      x: foundC * (cellSize + gap),
      y: foundR * (rowHeight + gap),
      w: colSpan * cellSize + (colSpan - 1) * gap,
      h: rowSpan * rowHeight + (rowSpan - 1) * gap,
    })
  }
  const totalRows = grid.length
  return { slots, totalHeight: totalRows * rowHeight + (totalRows - 1) * gap }
}
