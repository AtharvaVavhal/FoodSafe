/**
 * Groups an array of items into buckets: "Today", "Yesterday", or a
 * formatted date string. Items must have a `scannedAt` ISO timestamp.
 *
 * @param {Array<{scannedAt: string}>} items
 * @returns {Array<{label: string, items: Array}>}
 */
export function groupByDay(items) {
  const todayMs = startOfDay(new Date()).getTime()
  const yesterdayMs = todayMs - 86400000

  const map = new Map()

  for (const item of items) {
    const dayMs = startOfDay(new Date(item.scannedAt)).getTime()
    let label

    if (dayMs === todayMs) {
      label = 'Today'
    } else if (dayMs === yesterdayMs) {
      label = 'Yesterday'
    } else {
      label = new Date(item.scannedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
      })
    }

    if (!map.has(label)) map.set(label, [])
    map.get(label).push(item)
  }

  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** @param {string} iso */
export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}
