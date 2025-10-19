import type { IOContext } from '@vtex/api'

export type AppSettings = {
  apiBaseUrl?: string
  appKey?: string
  appToken?: string
  enableMock?: boolean
}

export function getSettings(ctx: { vtex: IOContext & { settings?: AppSettings } }): AppSettings {
  return ctx.vtex.settings || {}
}