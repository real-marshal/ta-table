import path from 'node:path'
import express from 'express'
import { rowRouter } from './row-router.js'

const app = express()

app.use(express.json())

app.use('/api/row', rowRouter)

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(import.meta.dirname, '../../client/dist')

  app.use(express.static(clientDist))
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.listen(3000, (err) => err && console.error(err))

console.log('Listening')
