# cash — Controle financeiro web

## What it does

cash é a adaptação web responsiva do app Expo Go financeiro enviado pelo usuário. Inclui login do proprietário, dashboard mensal, cartões, onboarding, navegação por período e lançamento manual.

## Data model

Entidades principais: `Category`, `Transaction`, `RecurringAccount`, `Payment`, `Card`, `Goal` e período mensal `YYYY-MM`. A persistência web usa coleções MongoDB com ids string UUID.

## Key flows

- Abrir o dashboard e ver saldo disponível, entradas, gastos, previsto, metas e Saldo Livre Real.
- Navegar entre meses pelo seletor no topo.
- Abrir onboarding e concluir ou pular suas etapas.
- Usar “Novo lançamento” para salvar entrada, gasto, conta fixa ou compra no crédito.
- Consultar Planejamento, Contas e Insights.
- Marcar contas fixas como pagas por mês.
- Abrir o cartão Nubank e consultar contas da fatura atual e próxima.
- Marcar contas fixas, parcelas e assinaturas no único bloco mensal da Home, incluindo pagas e não pagas.

## API

- `GET /api/finance/period` fornece o mês atual ancorado no servidor.
- `GET /api/finance/summary`, `/upcoming`, `/accounts`, `/insights` aceitam `reference=YYYY-MM`.
- `GET /api/finance/categories`, `/cards`, `/goals` carregam dados de apoio.
- `POST /api/finance/transactions` cria movimentação e converte crédito em parcela ou destino fixa em conta recorrente.
- `PATCH /api/finance/payments/{id}` alterna pagamento por referência mensal.

## Auth

No authentication is required in this demo adaptation.

## Auth

Conta única do proprietário por e-mail e senha, sem cadastro público.

## Limites intencionais

- Os dados do SQLite do aparelho não são transferidos automaticamente pela conversão; importação de backup JSON fica para uma fase posterior.
- Notificações reais do navegador ainda não estão conectadas; a configuração será migrada depois do núcleo financeiro.