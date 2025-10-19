import { IOClients, ExternalClient, InstanceOptions, IOContext, Apps } from '@vtex/api'

export class OwlApiClient extends ExternalClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    const baseURL = context.settings?.apiBaseUrl || 'http://localhost'
    super(baseURL, context, {
      retries: 2,
      ...options,
    })
  }

  public async createPayment(payload: any, headers: Record<string, string>) {
    return this.http.post('/payments', payload, { headers })
  }

  public async cancelPayment(paymentId: string, payload: any, headers: Record<string, string>) {
    return this.http.post(`/payments/${paymentId}/cancellations`, payload, { headers })
  }
}

export class Clients extends IOClients {
  public get owlApi() {
    return this.getOrSet('owlApi', OwlApiClient)
  }

  public get apps() {
    return this.getOrSet('apps', Apps)
  }
}
