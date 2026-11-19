# Finances — Gestão Financeira Pessoal (v1.0)

Aplicação web moderna de controle financeiro pessoal construída com **Next.js (App Router)**, **TypeScript**, **Tailwind CSS** e **Recharts**. Projetada para conciliar em uma única interface a visão real de **Fluxo de Caixa** (conta corrente/PIX) e o **Regime de Competência** (cartões de crédito, datas de fechamento e parcelamentos).

---

## Principais Funcionalidades

- **Regime de Caixa vs. Competência:**
  - **Saldo em Conta Real:** reflete apenas entradas efetivas e saídas à vista somadas às faturas de cartão efetivamente pagas no mês.
  - **Consumo do Mês (Competência):** consolida todos os gastos realizados no ciclo mensal (conta + cartões + aportes), independentemente da data de pagamento da fatura.
  - **Rolagem Automática de Saldo Inicial:** calcula dinamicamente a sobra líquida do mês anterior ou permite ajuste manual do saldo inicial do mês.
- **Gestão de Cartões de Crédito e Parcelamentos:**
  - Cálculo automático do mês de competência da fatura (`billing_month`) com base no dia de fechamento (`closing_day`) de cada cartão.
  - Lançamento de compras parceladas com projeção automática das parcelas subsequentes, preservação da data original da compra (`purchase_date`) e edição/exclusão com escopo configurável (*apenas esta parcela*, *esta e futuras* ou *todas*).
  - Ajuste individual de vencimento e opção de **postergação de fatura** sem falsos alertas de atraso.
- **Edição Inline Direta na Linha (Sanfona/Gaveta):**
  - Edição rápida de lançamentos diretamente na listagem (com exclusividade de uma linha aberta por vez e atalhos de teclado `Enter` para salvar e `Esc` para cancelar).
- **Carteira de Investimentos e Valores a Receber:**
  - Acompanhamento de ativos por instituição financeira, registro de aportes integrados ao orçamento e histórico mensal de rendimentos.
  - Controle de empréstimos/valores a receber com alertas de vencimento, baixa integrada como receita e link direto para lembrete via WhatsApp.
- **Importação e Backup Portátil (JSON / CSV):**
  - Exportação e restauração completa do banco local em formato `.json`.
  - Importador de extratos e faturas (`.csv` e `.json`) com mapeamento automático de categorias e revisão interativa antes da gravação.

---

## Arquitetura da v1.0 (Local-First) e Roadmap v2.0

### Decisão de Arquitetura — v1.0 (Modo Local / Offline no Navegador)
Na versão **v1.0**, o aplicativo foi desenhado sob uma arquitetura **Local-First**, operando **100% no navegador via `localStorage`** sem exigir configuração de banco de dados externo, variáveis de ambiente ou criação de conta:
- **Zero fricção para avaliação e uso local:** basta clonar o repositório e executar `npm run dev`. Na primeira execução, o sistema carrega dados fictícios de demonstração que podem ser limpos com um clique em *Configurações & Backup → Zerar e Começar do Zero*.
- **Reatividade instantânea:** sincronização entre componentes e abas por meio de eventos customizados no cliente (`finances-data-changed`, `finances-invoices-changed`, `finances-cards-changed`, `finances-categories-changed`).


---

## Como Executar Localmente

### Pré-requisitos
- **Node.js** 20+ e **npm** instalados.

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/Churiquem/finances
   cd finances
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000) no navegador.

4. **Compilação para produção (opcional):**
   ```bash
   npx tsc --noEmit
   npm run build
   npm run start
   ```

> **Nota sobre variáveis de ambiente:** Não é necessário criar arquivo `.env.local` para rodar a **v1.0** em modo local. O arquivo `.env.example` está incluído apenas como referência para testes de conexão com Supabase.

---

## Privacidade dos Dados e Backup Local

- **Armazenamento Exclusivo no Dispositivo:** no modo padrão da v1.0, todas as informações financeiras ficam salvas exclusivamente no `localStorage` do seu navegador. Nenhum dado pessoal ou financeiro é enviado para servidores externos.
- **Recomendação de Backup (`.json`):** como a limpeza de dados de navegação do browser pode remover o `localStorage`, utilize regularmente o menu **Configurações & Backup → Exportar Backup (.json)** no cabeçalho da aplicação para salvar uma cópia segura dos seus dados ou transferi-los para outro computador/celular.
- **Segurança em Repositórios Públicos:** o `.gitignore` está configurado para bloquear o envio acidental de planilhas (`.xlsx`, `.csv`), arquivos `.env` e backups `*backup*.json`.

---

## Stack Tecnológica

- **Framework:** Next.js 16 (App Router) + React 19
- **Linguagem:** TypeScript 5
- **Estilização:** Tailwind CSS 4 + Lucide Icons
- **Gráficos:** Recharts 3
- **Manipulação de Datas:** date-fns 4
- **Persistência:** Browser `localStorage` (v1.0) / Supabase PostgreSQL Client (preparado para v2.0)
