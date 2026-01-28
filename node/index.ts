import { ClientsConfig, ServiceContext, RecorderState, method } from '@vtex/api'
import { PaymentProviderService } from '@vtex/payment-provider'

import { Clients } from './modules/clients'
import { loadSettings } from './middlewares/loadSettings'
import OrigamiPaymentConnector from './connector'
import { eligibilityHandler } from './routes/eligibility'
import { confirmHandler } from './routes/confirm'

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
  type Context = ServiceContext<Clients, RecorderState> & {
    vtex: ServiceContext<Clients, RecorderState>['vtex'] & {
      settings?: import('./modules/utils/settings').AppSettings
    }
    request: ServiceContext<Clients, RecorderState>['request'] & {
      body?: unknown
    }
  }
}

export default new PaymentProviderService({
  clients,
  connector: OrigamiPaymentConnector,
  routes: {
    eligibility: method({ POST: [loadSettings, eligibilityHandler] }),
    confirm: method({ POST: [loadSettings, confirmHandler] }),
  },
})
