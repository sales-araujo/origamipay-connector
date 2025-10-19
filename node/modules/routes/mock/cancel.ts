import coBody from 'co-body'

const idempotencyStore = new Map<string, any>()

export async function mockCancelHandler(ctx: Context) {
  let paymentId: string | undefined

  if (ctx.vtex && ctx.vtex.routeParams && ctx.vtex.routeParams.paymentId) {
    paymentId = ctx.vtex.routeParams.paymentId
  } else if (ctx.params?.paymentId) {
    paymentId = ctx.params.paymentId
  } else if (ctx.request.url) {
    const match = ctx.request.url.match(/payments\/([^\/]+)\/cancellations/)
    if (match && match[1]) paymentId = match[1]
  }
  
  if (!paymentId) {
    ctx.status = 400
    ctx.body = { message: 'paymentId não informado' }
    return
  }
  const idem = ctx.get('Idempotency-Key') || ''
  if (idem && idempotencyStore.has(idem)) {
    ctx.status = 200
    ctx.body = idempotencyStore.get(idem)
    return
  }
  let body: any = ctx.request.body
  if (!body || Object.keys(body).length === 0) {
    if (ctx.req && ctx.req.readable !== false) {
      body = await coBody.json(ctx.req)
    }
  }
  const resp = {
    id: paymentId,
    status: 'canceled',
    cancellationId: body?.cancellationId,
  }
  if (idem) idempotencyStore.set(idem, resp)
  ctx.status = 200
  ctx.body = resp
}