# OrigamiPay Connector (VTEX IO)

O **OrigamiPay Connector** é um aplicativo backend para VTEX IO, projetado para servir de ponte entre o checkout VTEX e gateways de crédito consignado (como Owl Fintech/OrigamiPay). Criado para desafios técnicos e bancas, foca em arquitetura eficiente e flexível, simulando integrações reais via mock ativado por configuração administrativa.

---

## **Como rodar e testar o projeto no VTEX IO**

### **Requisitos Técnicos**
- Node.js 16+
- Yarn (instalar globalmente):
  ```bash
  npm install -g yarn
  ```
- VTEX CLI (instalar globalmente):
  ```bash
  yarn global add vtex
  ```
- Conta VTEX disponível

### **Primeiros Passos no CLI**
```bash
# 1. Login na sua conta VTEX IO
vtex login {{vendor}}

# 2. Usar/criar um workspace novo de testes
vtex use {{workspace}}

# 3. Instale dependências na pasta do projeto
cd origamipay-connector
cd node
yarn

# 4. Faça upload da app
vtex link

# 5. Acesse o Admin VTEX > Aplicativos > Meus aplicativos > OrigamiPay Connector > Configurações
e preencha os settings conforme instruções abaixo.
```

---

## **Configuração do App no Admin VTEX**

No painel do Admin do workspace criado, acesse: `Aplicativos > Meus aplicativos > OrigamiPay Connector > Configurações`

| Campo              | Descrição                                                                                               |
|--------------------|--------------------------------------------------------------------------------------------------------|
| **apiBaseUrl**     | Use `https://mock.owlpay.local` para o desafio técnico.                                                |
| **appKey**         | Chave de autenticação fictícia (ex: `testkey`).                                                        |
| **appToken**       | Token de autenticação fictício (ex: `testtoken`).                                                      |
| **enableMock**     | Marque esta opção para garantir simulação de todos os fluxos sem integração real.                      |

> **IMPORTANTE:** Sempre use `enableMock: true` para garantir avaliação por resposta interna simulada.

---

## **Fluxo de Teste dos Endpoints**

> **Todas as URLs seguem o padrão:**
>
> `https://{{workspace}}--{{vendor}}.myvtex.com/_v/origamipay/<endpoint>`
>
> Substitua `{{workspace}}` pelo seu workspace de testes e `{{vendor}}` pelo nome do seu vendor VTEX/conta.

### **1. Criar Pagamento**
- **Endpoint:**
  ```
  POST https://{{workspace}}--{{vendor}}.myvtex.com/_v/origamipay/payments
  ```
- **Headers:** `Content-Type: application/json`
- **Body exemplo:**
  ```json
  {
    "orderId": "vtex-123456",
    "paymentId": "pay-001",
    "value": 25000,
    "buyer": {
      "document": "12345678911",
      "email": "cliente@teste.com",
      "firstName": "Jose",
      "lastName": "Araujo"
    }
  }
  ```
- **Resposta:**
  ```json
  {
    "paymentId": "pay-001",
    "status": "approved",
    "tid": "TRX-...",
    "nsu": "..."
  }
  ```

### **2. Cancelar Pagamento**
- **Endpoint:**
  ```
  POST https://{{workspace}}--{{vendor}}.myvtex.com/_v/origamipay/payments/:paymentId/cancellations
  ```
- **Body exemplo:**
  ```json
  {
    "cancellationId": "cancel-1001",
    "value": 25000
  }
  ```
- **Resposta:**
  ```json
  {
    "paymentId": "pay-001",
    "status": "canceled",
    "cancellationId": "cancel-1001",
    "providerResponse": { ... }
  }
  ```

### **3. Callback**
- **Endpoint:**
  ```
  POST https://{{workspace}}--{{vendor}}.myvtex.com/_v/origamipay/payments/:paymentId/callback
  ```
- **Body exemplo:**
  ```json
  {
    "status": "approved",
    "observations": "Exemplo de callback"
  }
  ```
- **Resposta:**
  ```json
  {
    "ok": true,
    "paymentId": "pay-001",
    "receivedAt": "2024-06-19T01:23:45.678Z",
    "payload": {
      "status": "approved",
      "observations": "Exemplo de callback"
    }
  }
  ```

---

## **Campos dos Settings (Admin)**
- **apiBaseUrl:** Sempre use `https://mock.owlpay.local` para avaliação/desafio.
- **appKey/appToken:** Use valores fictícios (ex: `testkey`, `testtoken`).
- **enableMock:** Marque para garantir que TODOS os endpoints reais têm mock ativado (recomendado no desafio).

---

## **Observações e Entrega**
- Solução cobre todos os endpoints PPP: `/payments`, `/payments/:paymentId/cancellations`, `/payments/:paymentId/callback`.
- Settings são totalmente administrativas no Admin VTEX.
- Mock não deixa rastros de endpoint público, fluxo controlado por configuração, boa prática para segurança, clareza para bancas e acurácia em projetos empresariais.
- Testes podem ser feitos por Postman, Insomnia, cURL ou pelo checkout VTEX em ambiente de demonstração.
- Pronto para produção — para uso real, basta apontar `apiBaseUrl` para endpoint real da Owl Fintech/OrigamiPay e inserir suas credenciais oficiais no Admin.

---

**Dúvidas? Entre em contato!**
