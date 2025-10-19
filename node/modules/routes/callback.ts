import coBody from 'co-body'

export async function callbackHandler(ctx: Context) {
  let paymentId: string | undefined

  if (ctx.vtex && ctx.vtex.routeParams && ctx.vtex.routeParams.paymentId) {
    paymentId = ctx.vtex.routeParams.paymentId
  } else if (ctx.params?.paymentId) {
    paymentId = ctx.params.paymentId
  } else if (ctx.request.url) {
    const match = ctx.request.url.match(/payments\/([^\/]+)\/callback/)
    if (match && match[1]) paymentId = match[1]
  }

  if (!paymentId) {
    ctx.status = 400
    ctx.body = { message: 'paymentId não informado' }
    return
  }
  
  let body: any = ctx.request.body
  if (!body) {
    body = await coBody.json(ctx.req)
  }
  ctx.status = 200
  ctx.body = {
    ok: true,
    paymentId,
    receivedAt: new Date().toISOString(),
    payload: body,
  }
}