import express from 'express'
import { InMemoryStorage } from './in-memory-storage.js'
import Type from 'typebox'
import { validate } from './utils.js'

export const rowRouter = express.Router()

const limit = 20

const rows = new InMemoryStorage(
  Array.from({ length: 1_000_000 }).map((_, i) => ({ id: i }))
)

const selected = new InMemoryStorage()

const postRowBody = Type.Array(
  Type.Object({
    id: Type.Number({ minimum: 1 }),
  })
)

rowRouter.post('/', validate({ body: postRowBody }), ({ body }, res) => {
  body.forEach((row) => rows.insert(row))

  res.sendStatus(200)
})

const getRowQuery = Type.Object({
  nextCursor: Type.Optional(Type.Number()),
  filter: Type.Optional(
    Type.Union([Type.Number({ minimum: 1 }), Type.Array(Type.Number({ minimum: 1 }))])
  ),
})

rowRouter.get('/', validate({ query: getRowQuery }), ({ query }, res) => {
  const items = rows.selectMany({
    nextCursorId: query.nextCursor,
    limit,
    filter:
      Array.isArray(query.filter) || query.filter === undefined
        ? query.filter
        : [query.filter],
  })

  res.json({ items, nextCursor: items.length >= limit ? items.at(-1)?.id : undefined })
})

const postRowSelectedBody = Type.Array(
  Type.Object({
    id: Type.Number({ minimum: 1 }),
  })
)

rowRouter.post('/selected', validate({ body: postRowSelectedBody }), ({ body }, res) => {
  body.forEach((row) => selected.insert(row))

  res.sendStatus(200)
})

const getRowSelectedQuery = Type.Object({
  nextCursor: Type.Optional(Type.Number()),
  filter: Type.Optional(
    Type.Union([Type.Number({ minimum: 1 }), Type.Array(Type.Number({ minimum: 1 }))])
  ),
})

rowRouter.get('/selected', validate({ query: getRowSelectedQuery }), ({ query }, res) => {
  const items = selected.selectMany({
    nextCursorId: query.nextCursor,
    limit,
    filter:
      Array.isArray(query.filter) || query.filter === undefined
        ? query.filter
        : [query.filter],
  })

  res.json({ items, nextCursor: items.length >= limit ? items.at(-1)?.id : undefined })
})

const swapSchema = Type.Object({
  id1: Type.Number({ minimum: 1 }),
  id2: Type.Number({ minimum: 1 }),
})
const putRowSelectedOrderBody = Type.Union([swapSchema, Type.Array(swapSchema)])

rowRouter.put(
  '/selected/order',
  validate({ body: putRowSelectedOrderBody }),
  ({ body }, res) => {
    const changes = Array.isArray(body) ? body : [body]

    const result = changes.map(({ id1, id2 }) => selected.swap(id1, id2)).at(-1)

    res.json(result)
  }
)
