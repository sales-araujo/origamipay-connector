import React from 'react'

type EligibilityResponse = {
  cpf: string
  phone?: string
  eligible: boolean
  availableLimit: number
  currency: string
  message?: string
}

type AppPayload = {
  paymentId: string
  cpf?: string
  phone?: string
  eligibilityPath?: string
  confirmPath?: string
}

function formatCentsBRL(value: number) {
  try {
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return String(value)
  }
}

export default class PaymentApp extends React.Component<any, any> {
  state = {
    cpf: '',
    phone: '',
    loading: false,
    error: '',
    eligibility: null as EligibilityResponse | null,
    payload: null as AppPayload | null,
  }

  componentDidMount() {
    const payload = this.parsePayload()
    this.setState({
      payload,
      cpf: payload?.cpf ?? '',
      phone: payload?.phone ?? '',
    }, () => {
      // Se não veio CPF/telefone no payload do conector, tenta pegar do orderForm do checkout
      // (cliente logado / dados de perfil).
      this.tryHydrateFromOrderForm()
    })
  }

  async tryHydrateFromOrderForm() {
    try {
      const missingCpf = !String(this.state.cpf || '').trim()
      const missingPhone = !String(this.state.phone || '').trim()
      if (!missingCpf && !missingPhone) return

      const res = await fetch('/api/checkout/pub/orderForm', { credentials: 'same-origin' })
      if (!res.ok) return
      const orderForm = await res.json()

      const cpf =
        (orderForm?.clientProfileData?.document ?? orderForm?.clientProfileData?.documentNumber ?? '')
      const phone =
        (orderForm?.clientProfileData?.phone ?? orderForm?.clientProfileData?.phoneNumber ?? '')

      this.setState({
        cpf: missingCpf ? cpf : this.state.cpf,
        phone: missingPhone ? phone : this.state.phone,
      })
    } catch {
      // ignore
    }
  }

  parsePayload(): AppPayload | null {
    try {
      const raw = this.props?.appPayload
      if (!raw) return null
      if (typeof raw === 'string') return JSON.parse(raw)
      return raw
    } catch {
      return null
    }
  }

  triggerCheckoutValidation() {
    const w: any = window
    try {
      if (w?.$) {
        w.$(w).trigger('transactionValidation.vtex')
        return
      }
      w.dispatchEvent(new Event('transactionValidation.vtex'))
    } catch {
      // ignore
    }
  }

  async consultEligibility() {
    const payload = this.state.payload as AppPayload | null
    const path = payload?.eligibilityPath ?? '/_v/api/origami-vtex-connector/eligibility'
    const cpf = (this.state.cpf || '').trim()
    const phone = (this.state.phone || '').trim()
    if (!cpf) {
      this.setState({ error: 'Informe um CPF.' })
      return
    }
    if (!phone) {
      this.setState({ error: 'Informe um telefone com DDD.' })
      return
    }

    this.setState({ loading: true, error: '', eligibility: null })
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, phone }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as EligibilityResponse
      this.setState({ eligibility: data })
    } catch (e) {
      const error = e as any
      this.setState({ error: error?.message ?? 'Falha ao consultar elegibilidade.' })
    } finally {
      this.setState({ loading: false })
    }
  }

  async confirm(status: 'approved' | 'denied') {
    const payload = this.state.payload as AppPayload | null
    const path = payload?.confirmPath ?? '/_v/api/origami-vtex-connector/confirm'
    const paymentId = payload?.paymentId
    if (!paymentId) {
      this.setState({ error: 'paymentId ausente no payload do Payment App.' })
      return
    }

    this.setState({ loading: true, error: '' })
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, status }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      this.triggerCheckoutValidation()
    } catch (e) {
      const error = e as any
      this.setState({ error: error?.message ?? 'Falha ao confirmar.' })
    } finally {
      this.setState({ loading: false })
    }
  }

  render() {
    const { loading, error, eligibility } = this.state

    return (
      <div style={{ fontFamily: 'Arial, sans-serif', padding: 16 }}>
        <h2 style={{ margin: '0 0 12px 0' }}>Crédito Consignado OrigamiPay</h2>
        <p style={{ margin: '0 0 16px 0', color: '#555' }}>
          Confirme CPF e telefone para consultar sua margem.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            value={this.state.cpf}
            onChange={(e) => this.setState({ cpf: e.target.value })}
            placeholder="CPF"
            style={{
              flex: '1 1 220px',
              padding: 10,
              border: '1px solid #ccc',
              borderRadius: 6,
              fontSize: 14,
            }}
          />
          <input
            value={this.state.phone}
            onChange={(e) => this.setState({ phone: e.target.value })}
            placeholder="Telefone (DDD + número)"
            style={{
              flex: '1 1 220px',
              padding: 10,
              border: '1px solid #ccc',
              borderRadius: 6,
              fontSize: 14,
            }}
          />
          <button
            onClick={() => this.consultEligibility()}
            disabled={loading}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #111',
              background: '#111',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            Consultar margem
          </button>
        </div>

        {error ? (
          <div style={{ color: '#b00020', marginBottom: 12 }}>{error}</div>
        ) : null}

        {eligibility ? (
          <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Status:</strong> {eligibility.eligible ? 'Elegível' : 'Não elegível'}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Limite disponível:</strong>{' '}
              {eligibility.eligible ? formatCentsBRL(eligibility.availableLimit) : formatCentsBRL(0)}
            </div>
            <div style={{ color: '#666' }}>{eligibility.message}</div>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => this.confirm('approved')}
            disabled={loading || !eligibility?.eligible}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #0b5',
              background: eligibility?.eligible ? '#0b5' : '#ccc',
              color: '#fff',
              cursor: loading || !eligibility?.eligible ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            Confirmar compra no consignado
          </button>
          <button
            onClick={() => this.confirm('denied')}
            disabled={loading}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #999',
              background: '#fff',
              color: '#111',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }
}

