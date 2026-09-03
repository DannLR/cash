# cash — Controle financeiro web

## O que faz

Adaptação web responsiva do app Expo Go financeiro enviado pelo usuário. Reproduz onboarding, dashboard mensal, navegação por período, planejamento, contas, cartões, insights e lançamento manual.

## Modelo de dados

As entidades principais são `Category`, `Transaction`, `RecurringAccount`, `Payment`, `Card`, `Goal` e período mensal `YYYY-MM`. A persistência web usa coleções MongoDB com ids string UUID.

## Fluxos principais

- Dashboard com saldo disponível, entradas, gastos, previsto, metas e Saldo Livre Real
- Navegação entre meses
- Novo lançamento como entrada, gasto, conta fixa ou compra no crédito
- Planejamento de contas recorrentes
- Contas fixas com pagamento mensal
- Comparação de categorias e sugestões de economia
- Login exclusivo do proprietário por e-mail e senha
- Lista de cartões e detalhe de fatura com limite, vencimento, próxima fatura, parcelas e assinaturas
- Um único bloco mensal na Home lista contas fixas, parcelas e assinaturas com checkbox pago/não pago

## API

- `GET /api/finance/period`
- `GET /api/finance/summary`, `/upcoming`, `/accounts`, `/insights`
- `GET /api/finance/categories`, `/cards`, `/goals`
- `POST /api/finance/transactions`
- `PATCH /api/finance/payments/{id}`
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/finance/cards/{id}?reference=YYYY-MM`

## Auth

Conta única do proprietário, sem cadastro público. Sessão mantida por cookie HTTP-only e senha armazenada como hash PBKDF2.

## Limites conhecidos

Dados SQLite do aparelho não são transferidos automaticamente. Importação de backup JSON e notificações reais do navegador ficam para fases posteriores.