import { ClientsConfig, Service, ServiceContext, method, RecorderState } from '@vtex/api'
import { Clients } from './modules/clients'
import { createPaymentHandler } from './modules/routes/createPayment'
import { cancelPaymentHandler } from './modules/routes/cancelPayment'
import { callbackHandler } from './modules/routes/callback'
import { loadSettings } from './middlewares/loadSettings'

const TIMEOUT_MS = 8000

const clients: ClientsConfig<Clients> = {
  implementation: Clients,
  options: {
    default: {
      retries: 2,
      timeout: TIMEOUT_MS,
    },
  },
}

declare global {
  interface VTEXRouteParams {
    [key: string]: string | undefined
  }
  type Context = ServiceContext<Clients, RecorderState> & {
    vtex: ServiceContext<Clients, RecorderState>["vtex"] & {
      routeParams?: VTEXRouteParams;
      settings?: import("./modules/utils/settings").AppSettings;
    }
    request: ServiceContext<Clients, RecorderState>["request"] & {
      body?: unknown;
    }
  }
}

export default new Service({
  clients,
  routes: {
    payments: method({ POST: [loadSettings, createPaymentHandler] }),
    paymentCancellations: method({ POST: [loadSettings, cancelPaymentHandler] }),
    paymentCallback: method({ POST: [loadSettings, callbackHandler] })
  }
})
