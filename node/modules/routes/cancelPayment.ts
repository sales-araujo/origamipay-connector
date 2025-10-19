import { getSettings } from '../utils/settings'
import coBody from 'co-body'
import { mockCancelHandler } from './mock/cancel'

type CancelRequest = {
  cancellationId: string
  value?: number
}

export async function cancelPaymentHandler(ctx: Context) {
  let body: CancelRequest | undefined = ctx.request.body as any
  if (!body) {
    body = await coBody.json(ctx.req)
  }
  const paymentId = ctx.vtex.routeParams?.paymentId
  const { appKey, appToken, enableMock } = getSettings(ctx)

  if (enableMock) {
    return await mockCancelHandler(ctx)
  }

  if (!paymentId || !body?.cancellationId) {
    ctx.status = 400
    ctx.body = { message: 'Invalid payload' }
    return
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Idempotency-Key': `cancel-${body.cancellationId}`,
  }
  if (appKey && appToken) {
    headers['X-App-Key'] = appKey
    headers['X-App-Token'] = appToken
  }

  try {
    const response = await ctx.clients.owlApi.cancelPayment(
      paymentId,
      { amount: body.value, cancellationId: body.cancellationId },
      headers
    )

    ctx.status = 200
    ctx.body = {
      paymentId,
      status: 'canceled',
      cancellationId: body.cancellationId,
      providerResponse: response,
    }
  } catch (err) {
    const e = err as any
    ctx.status = 200
    ctx.body = {
      paymentId,
      status: 'cancelDenied',
      cancellationId: body.cancellationId,
      message: e?.response?.data || e?.message,
    }
  }
}
