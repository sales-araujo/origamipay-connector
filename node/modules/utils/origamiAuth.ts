import type { IOContext } from '@vtex/api'
import { getSettings } from './settings'
import type { OrigamiLoginResponse } from '../clients/origamiApi'

const BUCKET = 'origami-auth'
const KEY = 'access-token'

type StoredToken = OrigamiLoginResponse & { savedAt: string }

function isExpired(expiresAtIso: string, safetySeconds = 120) {
  const exp = new Date(expiresAtIso).getTime()
  const now = Date.now()
  return now >= exp - safetySeconds * 1000
}

export async function getOrigamiAccessToken(ctx: IOContext & { clients?: any }): Promise<string> {
  const settings = getSettings({ vtex: ctx as any })
  const origamiKey = settings.origamiKey
  const origamiToken = settings.origamiToken

  if (!origamiKey || !origamiToken) {
    throw new Error('Origami credentials não configuradas (origamiKey/origamiToken)')
  }

  const vbase = (ctx as any).clients?.vbase
  const origamiApi = (ctx as any).clients?.origamiApi

  if (!vbase || !origamiApi) {
    throw new Error('Clients não disponíveis (vbase/origamiApi)')
  }

  const cached: StoredToken | null = await vbase.getJSON(BUCKET, KEY, true)
  if (cached?.accessToken && cached?.expiresAt && !isExpired(cached.expiresAt)) {
    return cached.accessToken
  }

  const login = await origamiApi.login(origamiKey, origamiToken)
  const toStore: StoredToken = { ...login, savedAt: new Date().toISOString() }
  await vbase.saveJSON(BUCKET, KEY, toStore)
  return login.accessToken
}

