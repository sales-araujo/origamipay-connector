import coBody from 'co-body'

type ConfirmRequest = {
  paymentId: string
  status: 'approved' | 'denied'
  message?: string
}

const BUCKET = 'origami-payment-authorizations'

/**
 * MVP: endpoint chamado pelo Payment App para finalizar a decisão do pagamento.
 * - Persiste status em VBase
 * - Dispara callback (retry) para o Gateway atualizar o status via /payments
 */
export async function confirmHandler(ctx: Context) {
  const body = ((ctx.request.body as any) ?? (await coBody.json(ctx.req))) as ConfirmRequest

  if (!body?.paymentId || (body.status !== 'approved' && body.status !== 'denied')) {
    ctx.status = 400
    ctx.body = { message: 'paymentId e status (approved|denied) são obrigatórios' }
    return
  }

  const vbase = (ctx.clients as any).vbase
  const existing = await vbase.getJSON(BUCKET, body.paymentId, true)

  const updated = {
    ...(existing ?? {}),
    paymentId: body.paymentId,
    status: body.status,
    updatedAt: new Date().toISOString(),
    message: body.message ?? null,
  }

  await vbase.saveJSON(BUCKET, body.paymentId, updated)

  ctx.status = 200
  ctx.body = { ok: true, paymentId: body.paymentId, status: body.status }
}

