import { AppSettings } from '../modules/utils/settings'

export async function loadSettings(ctx: Context, next: () => Promise<any>) {
  if (!ctx.vtex.settings) {
    try {
      const appId = `${process.env.VTEX_APP_ID || 'acctglobal.origamipay-connector@0.0.0'}`
      const [vendorName] = appId.split('@')
      const settings = await ctx.clients.apps.getAppSettings(vendorName)
      ctx.vtex.settings = settings as unknown as AppSettings
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }
  await next()
}