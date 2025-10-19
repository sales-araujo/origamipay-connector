import { getSettings } from '../utils/settings'
import { mockCreateHandler } from './mock/create'
import coBody from 'co-body'

type VtexCreatePaymentRequest = {
  orderId: string
  paymentId: string
  value: number
  buyer: { document: string; email?: string; firstName?: string; lastName?: string }
}

export async function createPaymentHandler(ctx: Context) {
  let body: VtexCreatePaymentRequest | undefined = ctx.request.body as any
  if (!body) {
    body = await coBody.json(ctx.req)
  }
  const { appKey, appToken, enableMock } = getSettings(ctx)

  if (!body?.paymentId || !body?.orderId) {
    ctx.status = 400
    ctx.body = { message: 'Invalid payload' }
    return
  }

  const idempotencyKey = `pay-${body.paymentId}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
  }
  if (appKey && appToken) {
    headers['X-App-Key'] = appKey
    headers['X-App-Token'] = appToken
  }

  if (enableMock) {
    return await mockCreateHandler(ctx)
  }

  try {
    const response = await ctx.clients.owlApi.createPayment(
      {
        orderId: body.orderId,
        amount: body.value,
        customerCpf: body.buyer?.document,
        reference: body.paymentId,
      },
      headers
    )
    type OwlApiResponse = { transactionId?: string; id?: string; nsu?: string }
    const typedResponse = response as unknown as OwlApiResponse
    ctx.status = 200
    ctx.body = {
      paymentId: body.paymentId,
      status: 'approved',
      tid: typedResponse.transactionId || typedResponse.id || body.paymentId,
      nsu: typedResponse.nsu || undefined,
    }
  } catch (err) {
    const e = err as any
    ctx.status = 200
    ctx.body = {
      paymentId: body.paymentId,
      status: 'denied',
      message: e?.response?.data || e?.message,
    }
  }
}


