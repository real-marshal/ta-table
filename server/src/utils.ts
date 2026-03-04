import type { StaticDecode, TSchema } from 'typebox'
import type { RequestHandler } from 'express'
import { Compile } from 'typebox/compile'
import { Settings } from 'typebox/system'

Settings.Set({ correctiveParse: true })

export function validate<TBody extends TSchema, TQuery extends TSchema>({
  body,
  query,
}: {
  body?: TBody
  query?: TQuery
}): RequestHandler<
  Record<string, string>,
  any,
  StaticDecode<TBody>,
  StaticDecode<TQuery>
> {
  const compiledBodySchema = body && Compile(body)
  const compiledQuerySchema = query && Compile(query)

  return (req, res, next) => {
    try {
      if (compiledBodySchema) req.body = compiledBodySchema.Decode(req.body)
      if (compiledQuerySchema)
        Object.defineProperty(req, 'query', {
          value: compiledQuerySchema.Decode(req.query),
        })
    } catch (err) {
      return res.status(400).json(err instanceof Error ? err.cause : err)
    }

    next()
  }
}
