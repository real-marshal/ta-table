import type { Row } from './App.tsx'

const addDelay = 10_000

const pendingAdds = new Set<number>()
let addFlushTimeout: number | null = null

export function queueAdd(id: number) {
  pendingAdds.add(id)

  addFlushTimeout ??= setTimeout(async () => {
    await fetch('/api/row', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([...pendingAdds].map((id) => ({ id }))),
    })

    pendingAdds.clear()
    addFlushTimeout = null
  }, addDelay)
}

const swapDelay = 1_000

let pendingSwaps: { id1: number; id2: number }[] = []
let swapFlushTimeout: number | null = null

export function queueSwap(id1: number, id2: number) {
  pendingSwaps.push({ id1, id2 })

  swapFlushTimeout ??= setTimeout(async () => {
    await fetch('/api/row/selected/order', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pendingSwaps),
    })

    pendingSwaps = []
    swapFlushTimeout = null
  }, swapDelay)
}

const markAsPendingDelay = 1_000

let pendingMarkAsSelecteds = new Set<number>()
let markAsSelectedFlushTimeout: number | null = null

export function queueMarkAsSelected(id: number) {
  pendingMarkAsSelecteds.add(id)

  markAsSelectedFlushTimeout ??= setTimeout(async () => {
    await fetch('/api/row/selected', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([...pendingMarkAsSelecteds].map((id) => ({ id }))),
    })

    pendingMarkAsSelecteds.clear()
    markAsSelectedFlushTimeout = null
  }, markAsPendingDelay)
}

export async function fetchMore({
  nextCursor,
  filter,
  selected,
}: {
  nextCursor?: number
  filter?: string[]
  selected?: boolean
}): Promise<{ items: Row[]; nextCursor?: number }> {
  const params = new URLSearchParams()

  nextCursor && params.set('nextCursor', nextCursor.toString())
  filter && filter.forEach((it) => params.append('filter', it))

  const res = await fetch(`/api/row${selected ? '/selected' : ''}?${params}`, {})

  if (!res.ok) {
    throw new Error(await res.json())
  }

  return res.json()
}
