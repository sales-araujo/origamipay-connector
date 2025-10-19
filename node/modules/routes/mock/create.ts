const idempotencyStore = new Map<string, any>()

export async function mockCreateHandler(ctx: Context) {
  const idem = ctx.get('Idempotency-Key') || ''
  if (idem && idempotencyStore.has(idem)) {
    ctx.status = 200
    ctx.body = idempotencyStore.get(idem)
    return
  }

  const body = ctx.request.body as { reference?: string }
  const transactionId = `TRX-${Math.floor(Math.random() * 10 ** 10)}`
  const resp = {
    id: body?.reference || transactionId,
    transactionId,
    status: 'approved',
    nsu: `${Date.now()}`,
  }
  if (idem) idempotencyStore.set(idem, resp)
  ctx.status = 200
  ctx.body = resp
}


