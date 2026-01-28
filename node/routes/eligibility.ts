import coBody from 'co-body'
import { getOrigamiAccessToken } from '../modules/utils/origamiAuth'

type EligibilityRequest = {
  cpf: string
  phone: string
}

/**
 * MVP: endpoint chamado pelo Payment App para consultar margem na Origami API.
 * - Login: POST /auth/login (JWT 24h)
 * - Margem: POST /integrations/margin/check (cpf + phone)
 */
export async function eligibilityHandler(ctx: Context) {
  const body = ((ctx.request.body as any) ?? (await coBody.json(ctx.req))) as EligibilityRequest
  const cpf = body?.cpf?.replace(/\D/g, '')
  const phone = body?.phone?.replace(/\D/g, '')

  if (!cpf) {
    ctx.status = 400
    ctx.body = { message: 'cpf obrigatório' }
    return
  }

  if (!phone) {
    ctx.status = 400
    ctx.body = { message: 'phone obrigatório' }
    return
  }

  try {
    const accessToken = await getOrigamiAccessToken(ctx.vtex as any)
    const resp = await ctx.clients.origamiApi.marginCheck(accessToken, { cpf, phone })

    // Origami retorna marginAvailable em reais (decimal). Na UI, trabalhamos com centavos.
    const marginAvailable = Number(resp?.marginAvailable ?? 0)
    const availableLimitCents = Math.round(marginAvailable * 100)
    const eligible = Boolean(resp?.isEligible)

    ctx.status = 200
    ctx.body = {
      cpf,
      phone,
      eligible,
      availableLimit: availableLimitCents,
      currency: 'BRL',
      message: eligible ? 'Elegível' : 'Não elegível',
      origami: {
        name: resp?.name,
        employerName: resp?.employerName,
        totalEarnings: resp?.totalEarnings,
        marginAvailable: resp?.marginAvailable,
      },
    }
  } catch (e) {
    // O restinho do seu código (e.response, e.message) continuará funcionando 
    // porque o TS inferirá 'e' como 'any' ou você pode fazer o cast interno.
    const error = e as any 
    ctx.status = 502
    ctx.body = {
      message: 'Falha ao consultar margem na Origami',
      details: error?.response?.data ?? error?.message ?? String(error),
    }
  }
}

