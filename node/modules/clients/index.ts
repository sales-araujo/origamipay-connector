import { IOClients, Apps, VBase } from '@vtex/api'
import { OrigamiApiClient } from './origamiApi'

export class Clients extends IOClients {
  public get origamiApi() {
    return this.getOrSet('origamiApi', OrigamiApiClient)
  }

  public get apps() {
    return this.getOrSet('apps', Apps)
  }

  public get vbase() {
    return this.getOrSet('vbase', VBase)
  }
}
