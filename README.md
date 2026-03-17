# Financial Sandbox & What-If Analyzer

A full-stack financial scenario planning tool that forecasts wealth and cash flow over time. Users can model their income, expenses, assets, and investments, then use "What-If" sliders to instantly see the impact of different scenarios. Currency is GBP (£).

## Stack

- **Monorepo**: npm workspaces
- **Frontend**: React + Vite + Tailwind CSS + Recharts + Framer Motion
- **Backend**: FastAPI (Python 3.12) with SQLAlchemy + Pydantic
- **Database**: PostgreSQL via SQLAlchemy + Alembic
- **API codegen**: Orval (from OpenAPI spec)

## Running Locally

### Prerequisites

- npm
- Node.js 24
- Python 3.12 (pyenv recommended)
- PostgreSQL (local or Docker)

### 1. PostgreSQL

**Option A – Local PostgreSQL**

```bash
createdb asset_manager
```

**Option B – Docker**

```bash
docker run -d --name asset-manager-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=asset_manager \
  -p 5432:5432 postgres:16
```

### 2. Environment

Copy `.env.example` to `.env` and set your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asset_manager
PORT=8080
```

### 3. Python Backend (pyenv)

```bash
pyenv install 3.12
cd backend
pyenv local 3.12
pyenv virtualenv 3.12 asset-manager-backend
pyenv activate asset-manager-backend
pip install -e .
alembic upgrade head
```

### 4. Node Frontend

```bash
npm install
```

### 5. Start Backend and Frontend

**Terminal 1 – API server**

```bash
cd backend
pyenv activate asset-manager-backend
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

**Terminal 2 – Frontend**

```bash
npm run dev:frontend
```

The frontend runs on port 5173 by default and proxies `/api` to the backend (port 8080).

### 6. Verify

- Open http://localhost:5173
- API health: `curl http://localhost:8080/api/healthz`

## Testing Config Saving

1. **Auto-save (budget)**: Change income/expense/asset, wait ~1s, refresh — changes should persist.
2. **Saved scenarios**: Click "Configs" in the header → "Save current config" → enter name/description. Change data, then load the saved scenario — data should match.

## Documentation

See [replit.md](replit.md) for structure, features, API endpoints, and maintenance notes.
