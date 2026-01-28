import type { IOContext } from '@vtex/api'

export type AppSettings = {
  // Origami API
  origamiEnvironment?: 'homolog' | 'production'
  origamiKey?: string
  origamiToken?: string

  // Legacy / placeholder (mantido por compatibilidade com o schema atual)
  apiBaseUrl?: string
  appKey?: string
  appToken?: string
  enableMock?: boolean
}

export function getSettings(ctx: { vtex: IOContext & { settings?: AppSettings } }): AppSettings {
  return ctx.vtex.settings || {}
}