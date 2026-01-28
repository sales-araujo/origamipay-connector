import { ExternalClient, InstanceOptions, IOContext } from '@vtex/api'

export type OrigamiLoginResponse = {
  accessToken: string
  expiresAt: string
  tokenType: 'bearer' | string
}

export type OrigamiMarginCheckRequest = {
  cpf: string
  phone: string
}

export type OrigamiMarginCheckResponse = {
  cpf: number
  name: string
  isEligible: boolean
  marginAvailable: number
  totalEarnings?: number
  employerName?: string
  // ... outros campos existem; no MVP não precisamos tipar tudo
  [key: string]: any
}

export class OrigamiApiClient extends ExternalClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    const env = (ctx.settings as any)?.origamiEnvironment ?? 'homolog'
    const baseURL =
      env === 'production' ? 'https://api.origamipay.com.br' : 'https://api-homolog.origamipay.com.br'

    super(baseURL, ctx, {
      retries: 2,
      timeout: 8000,
      ...options,
    })
  }

  public login(origamiKey: string, origamiToken: string) {
    return this.http.post<OrigamiLoginResponse>('/auth/login', { origamiKey, origamiToken })
  }

  public marginCheck(accessToken: string, payload: OrigamiMarginCheckRequest) {
    return this.http.post<OrigamiMarginCheckResponse>('/integrations/margin/check', payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
  }
}

