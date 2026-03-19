# Sistema de Gestão de Frota

Sistema completo de gestão de frota de caminhões com API backend (Node.js + Express + SQLite) e frontend em HTML/JavaScript.

## 🚀 Funcionalidades principais

- Autenticação JWT: cadastro, login, logout
- Gerenciamento de viagens: criar, listar, detalhar, encerrar
- Controle de despesas por viagem:
  - Combustível
  - Pedágios
  - Manutenção
  - Outros
- Cálculos automáticos: distância, custo por km, lucro, etc.
- Relatórios com filtros por data, motorista, placa
- Exportação CSV/Impressão PDF (via frontend)
- Subscrição/plano de uso (módulo Stripe stub)

## 🧩 Estrutura do projeto

- `backend/`
  - `server.js` - ponto de entrada da API
  - `app.js` - configuração de Express, middlewares e roteadores
  - `routes/` - `auth.js`, `trips.js`, `expenses.js`, `reports.js`, `subscription.js`
  - `middleware/auth.js` - validação de token e permissão de propriedade
  - `database/init.js` - inicialização do SQLite e schema
  - `database.sqlite` - arquivo de dados persistentes (criado em runtime)
- `index.html` - frontend principal
- `styles.css` - estilos do app frontend
- `app.js` - lógica do frontend para interações e chamadas à API

## 🛠️ Requisitos

- Node.js 16+ / npm
- Navegador moderno (Chrome, Edge, Firefox)

## 🎯 Setup e execução

1. Clone o repo

```bash
git clone <repo-url> sistema-frota
cd sistema-frota/backend
```

2. Instale dependências

```bash
npm install
```

3. Inicie o backend

```bash
npm start
```

4. Abra o frontend

- Acesse `index.html` diretamente no navegador, ou
- Sirva via servidor local (recomendado):

```bash
cd ../
python3 -m http.server 8000
```

e abra `http://localhost:8000`

5. API padrão: `http://localhost:3001/api`

## 🔐 Endpoints principais (Backend)

### Autenticação
- `POST /api/auth/register` - cadastro (email, senha, nome)
- `POST /api/auth/login` - login (email, senha)
- `GET /api/auth/profile` - dados do usuário (token Bearer)

### Viagens
- `GET /api/trips` - lista de viagens do usuário
- `POST /api/trips` - cria nova viagem
- `GET /api/trips/:tripId` - detalhe da viagem
- `PUT /api/trips/:tripId/end` - encerra a viagem

### Despesas
- `GET /api/expenses?trip_id={tripId}` - lista de despesas da viagem
- `POST /api/expenses/:tripId/fuel` - registrar combustível
- `POST /api/expenses/:tripId/other` - registrar despesa genérica

### Relatórios
- `GET /api/reports` - lista relatórios
- `GET /api/reports/csv` - gera CSV

### Assinatura
- `POST /api/subscription/create-checkout-session` - iniciar checkout Stripe
- `POST /api/subscription/webhook` - webhook de evento Stripe

## 🧪 Workflow rápido (curl)

```bash
# registro/login
curl -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d '{"email":"teste@example.com","password":"senha","name":"Teste"}'
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"teste@example.com","password":"senha"}' | jq -r '.token')

# criar viagem
curl -X POST http://localhost:3001/api/trips -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"plate":"ABC1234","driver":"Fulano","date_start":"2026-03-19","km_start":1000,"origin":"SP","destination":"RJ","freight_value":5000}'

# adicionar despesas
TRIP_ID=1
curl -X POST http://localhost:3001/api/expenses/$TRIP_ID/fuel -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"place":"Posto X","km":1010,"liters":200,"value":1000,"date":"2026-03-19"}'
```

## ✅ Observações

- Inicialmente o banco é criado automaticamente em `backend/database.sqlite`.
- Atualize `backend/.env` (se presente) para `JWT_SECRET`/variáveis Stripe em produção.
- `frontend/app.js` já está configurado para consumir o baseURL `http://localhost:3001/api`.

## 📦 Contribuições
- Abra issues para bugs e feature requests
- Usar branch `feature/x` e PR com descrição clara
- Testes formam parte futura de CI (não incluídos ainda)

---

*Criado por sistema-frota*</content>
<parameter name="filePath">/home/cassio/projects/sistema-frota/README.md