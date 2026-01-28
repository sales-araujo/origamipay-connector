import {
  AuthorizationRequest,
  AuthorizationResponse,
  CancellationRequest,
  CancellationResponse,
  Cancellations,
  PaymentProvider,
  RefundRequest,
  RefundResponse,
  Refunds,
  SettlementRequest,
  SettlementResponse,
  Settlements,
} from '@vtex/payment-provider'

type StoredAuthorization = {
  paymentId: string
  status: AuthorizationResponse['status']
  createdAt: string
  updatedAt: string
  callbackUrl?: string
  authorizationId?: string
  tid?: string
  nsu?: string
  message?: string | null
}

const BUCKET = 'origami-payment-authorizations'

function nowIso() {
  return new Date().toISOString()
}

function getAppVendorAndNameFromEnv() {
  // VTEX_APP_ID example: vendor.appname@0.0.1
  const appId = process.env.VTEX_APP_ID ?? ''
  const [fullName] = appId.split('@')
  const [vendor, name] = fullName.split('.')
  return { vendor, name, fullName }
}

function getCpfFromAuthorization(authorization: AuthorizationRequest): string | undefined {
  // PPP payload includes buyer document in miniCart.buyer.document (string)
  // but can also be present in card.document in some flows.
  const anyAuth = authorization as any
  return (
    anyAuth?.miniCart?.buyer?.document ||
    anyAuth?.card?.document ||
    anyAuth?.buyer?.document ||
    undefined
  )
}

async function saveAuthorization(ctx: any, data: StoredAuthorization) {
  const vbase = (ctx as any).clients?.vbase
  if (!vbase) return
  await vbase.saveJSON(BUCKET, data.paymentId, data)
}

async function getAuthorization(ctx: any, paymentId: string): Promise<StoredAuthorization | null> {
  const vbase = (ctx as any).clients?.vbase
  if (!vbase) return null
  return vbase.getJSON(BUCKET, paymentId, true)
}

function getPhoneFromAuthorization(authorization: AuthorizationRequest): string | undefined {
  const anyAuth = authorization as any
  return (
    anyAuth?.miniCart?.buyer?.phone ||
    anyAuth?.buyer?.phone ||
    anyAuth?.miniCart?.buyer?.phoneNumber ||
    undefined
  )
}

function normalizeDigits(value?: string) {
  if (!value) return undefined
  const digits = value.replace(/\D/g, '')
  return digits || undefined
}

function normalizePhoneBR(value?: string) {
  const digits = normalizeDigits(value)
  if (!digits) return undefined
  // remove código do país se vier (55)
  if (digits.length > 11 && digits.startsWith('55')) return digits.slice(2)
  // em geral queremos DDD + número (10 ou 11). Se vier maior, mantém últimos 11.
  if (digits.length > 11) return digits.slice(-11)
  return digits
}

export default class OrigamiPaymentConnector extends PaymentProvider {
  /**
   * Authorization (/payments)
   *
   * - Deve ser idempotente (retornar sempre o status mais atualizado para o mesmo paymentId)
   * - Para fluxo assíncrono: retornar status "undefined" + delayToCancel, e depois chamar callbackUrl (retry no caso de IO)
   */
  public async authorize(authorization: AuthorizationRequest): Promise<AuthorizationResponse> {
    // Se já temos status persistido, devolve imediatamente (idempotência)
    const persisted = await getAuthorization(this.context, authorization.paymentId)
    if (persisted) {
      return {
        paymentId: persisted.paymentId,
        status: persisted.status,
        authorizationId: persisted.authorizationId,
        tid: persisted.tid,
        nsu: persisted.nsu,
        acquirer: 'OrigamiPay',
        code: persisted.status === 'denied' ? 'denied' : 'ok',
        message: persisted.message ?? null,
        delayToCancel: 86400,
      } as any
    }

    // Test Suite: seguimos o comportamento esperado pela VTEX para os cartões específicos
    if (this.isTestSuite) {
      const anyAuth = authorization as any
      const cardNumber: string | undefined = anyAuth?.card?.number

      if (cardNumber === '4444333322221111') {
        const resp: AuthorizationResponse = {
          paymentId: authorization.paymentId,
          status: 'approved',
          authorizationId: `AUT-${authorization.paymentId}`,
          tid: `TID-${authorization.paymentId}`,
          nsu: `NSU-${authorization.paymentId}`,
          acquirer: 'OrigamiPay',
          code: '0000',
          message: null,
          delayToCancel: 86400,
        } as any
        await saveAuthorization(this.context, {
          paymentId: authorization.paymentId,
          status: resp.status,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          callbackUrl: (authorization as any).callbackUrl,
          authorizationId: (resp as any).authorizationId,
          tid: (resp as any).tid,
          nsu: (resp as any).nsu,
          message: null,
        })
        return resp
      }

      if (cardNumber === '4444333322221112') {
        const resp: AuthorizationResponse = {
          paymentId: authorization.paymentId,
          status: 'denied',
          authorizationId: `AUT-${authorization.paymentId}`,
          tid: `TID-${authorization.paymentId}`,
          nsu: `NSU-${authorization.paymentId}`,
          acquirer: 'OrigamiPay',
          code: 'denied',
          message: 'Denied by test suite scenario',
          delayToCancel: 86400,
        } as any
        await saveAuthorization(this.context, {
          paymentId: authorization.paymentId,
          status: resp.status,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          callbackUrl: (authorization as any).callbackUrl,
          authorizationId: (resp as any).authorizationId,
          tid: (resp as any).tid,
          nsu: (resp as any).nsu,
          message: 'Denied by test suite scenario',
        })
        return resp
      }

      if (cardNumber === '4222222222222224' || cardNumber === '4222222222222225') {
        const asyncResp: AuthorizationResponse = {
          paymentId: authorization.paymentId,
          status: 'undefined',
          authorizationId: `AUT-${authorization.paymentId}-ASYNC`,
          tid: `TID-${authorization.paymentId}-ASYNC`,
          nsu: `NSU-${authorization.paymentId}-ASYNC`,
          acquirer: 'OrigamiPay',
          code: '2000-ASYNC',
          message: null,
          delayToCancel: 86400,
        } as any

        await saveAuthorization(this.context, {
          paymentId: authorization.paymentId,
          status: asyncResp.status,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          callbackUrl: (authorization as any).callbackUrl,
          authorizationId: (asyncResp as any).authorizationId,
          tid: (asyncResp as any).tid,
          nsu: (asyncResp as any).nsu,
          message: null,
        })

        // dispara callback após 15s (como esperado nos testes Async Approved/Denied)
        setTimeout(() => {
          const finalStatus = cardNumber === '4222222222222224' ? 'approved' : 'denied'
          const resp: AuthorizationResponse = {
            paymentId: authorization.paymentId,
            status: finalStatus as any,
            authorizationId: `AUT-${authorization.paymentId}-FINAL`,
            tid: `TID-${authorization.paymentId}-FINAL`,
            nsu: `NSU-${authorization.paymentId}-FINAL`,
            acquirer: 'OrigamiPay',
            code: finalStatus === 'approved' ? '0000' : 'denied',
            message: null,
            delayToCancel: 86400,
          } as any

          // persiste e chama callbackUrl (no IO, normalmente é o endpoint /retry)
          saveAuthorization(this.context, {
            paymentId: authorization.paymentId,
            status: resp.status,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            callbackUrl: (authorization as any).callbackUrl,
            authorizationId: (resp as any).authorizationId,
            tid: (resp as any).tid,
            nsu: (resp as any).nsu,
            message: null,
          }).catch(() => null)

          try {
            this.callback(authorization, resp)
          } catch {
            // ignore
          }
        }, 15000)

        return asyncResp
      }
    }

    // MVP real: inicia fluxo assíncrono (ex.: análise de elegibilidade/assinatura)
    const cpf = normalizeDigits(getCpfFromAuthorization(authorization))
    const phone = normalizePhoneBR(getPhoneFromAuthorization(authorization))
    const { fullName } = getAppVendorAndNameFromEnv()

    const appNameForPaymentApp = fullName || undefined

    const resp: AuthorizationResponse = {
      paymentId: authorization.paymentId,
      status: 'undefined',
      authorizationId: `AUT-${authorization.paymentId}-PENDING`,
      tid: `TID-${authorization.paymentId}-PENDING`,
      nsu: `NSU-${authorization.paymentId}-PENDING`,
      acquirer: 'OrigamiPay',
      code: 'pending',
      message: null,
      delayToCancel: 86400,
      paymentAppData: appNameForPaymentApp
        ? {
            appName: appNameForPaymentApp,
            payload: JSON.stringify({
              paymentId: authorization.paymentId,
              cpf,
              phone,
              // Rotas extras do Node (expostas pelo próprio app no IO)
              eligibilityPath: '/_v/api/origami-vtex-connector/eligibility',
              confirmPath: '/_v/api/origami-vtex-connector/confirm'
            }),
          }
        : undefined,
    } as any

    await saveAuthorization(this.context, {
      paymentId: authorization.paymentId,
      status: resp.status,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      callbackUrl: (authorization as any).callbackUrl,
      authorizationId: (resp as any).authorizationId,
      tid: (resp as any).tid,
      nsu: (resp as any).nsu,
      message: null,
    })

    return resp
  }

  public async cancel(cancellation: CancellationRequest): Promise<CancellationResponse> {
    // MVP: apenas aprova cancelamento (e persiste)
    const resp = Cancellations.approve(cancellation, { cancellationId: `CXL-${cancellation.paymentId}` })
    await saveAuthorization(this.context, {
      paymentId: cancellation.paymentId,
      status: 'canceled' as any,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      message: 'canceled',
    })
    return resp as any
  }

  public async refund(refund: RefundRequest): Promise<RefundResponse> {
    // MVP: negar por padrão (crédito consignado normalmente exige fluxo próprio)
    return Refunds.deny(refund) as any
  }

  public async settle(settlement: SettlementRequest): Promise<SettlementResponse> {
    // MVP: negar por padrão; quando integrar de verdade, capturar/liquidar no momento correto.
    return Settlements.deny(settlement) as any
  }

  // Endpoint inbound é opcional no MVP
  public inbound: undefined
}

