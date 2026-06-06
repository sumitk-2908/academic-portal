#!/usr/bin/env bash
# ============================================================
# Academic Portal — Standard Python 3.12 Setup
# ============================================================
set -e

B='\033[0;34m'; G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; NC='\033[0m'

echo -e "${B} ╔══════════════════════════════════════════════╗${NC}"
echo -e "${B} ║    Academic Portal — Final Project Setup     ║${NC}"
echo -e "${B} ╚══════════════════════════════════════════════╝${NC}"

ROOT_DIR=$(pwd)

# ============================================================
# STEP 1 — NEXT.JS FRONTEND
# ============================================================
echo -e "\n${Y}[1/4] Creating Next.js frontend...${NC}"

npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
cd frontend

echo -e "\n${Y}[2/4] Installing frontend dependencies...${NC}"
npm install @tanstack/react-query@5 axios clsx tailwind-merge lucide-react next-themes react-hook-form @hookform/resolvers zod fuse.js @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-toast @radix-ui/react-dropdown-menu
npm install -D prettier prettier-plugin-tailwindcss @types/node

cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME="Academic Portal"
EOF

cd "$ROOT_DIR"

# ============================================================
# STEP 2 — FASTAPI BACKEND 
# ============================================================
echo -e "\n${Y}[3/4] Setting up FastAPI backend...${NC}"

mkdir -p backend/app/{routers,models,schemas,services,utils}
cd backend

# Create venv and activate it (handles Windows paths)
python -m venv venv
source venv/Scripts/activate || source venv/bin/activate

# Install the high-performance standard libraries
pip install -q fastapi "uvicorn[standard]" sqlalchemy "psycopg[binary]" alembic "python-dotenv" "pydantic-settings" "python-multipart" "python-jose[cryptography]" "passlib[bcrypt]" fuzzywuzzy python-Levenshtein boto3 httpx

alembic init alembic
sed -i 's|sqlalchemy.url = driver://user:pass@localhost/dbname|sqlalchemy.url = %(DATABASE_URL)s|g' alembic.ini

cat > .env << 'EOF'
APP_NAME="Academic Portal API"
APP_ENV=development
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/academic_portal
EOF

cat > app/main.py << 'EOF'
from fastapi import FastAPI
app = FastAPI(title="Academic Portal API")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
EOF

deactivate
cd "$ROOT_DIR"

# ============================================================
# STEP 3 — DOCKER COMPOSE
# ============================================================
echo -e "\n${Y}[4/4] Writing docker-compose.yml...${NC}"

cat > docker-compose.yml << 'EOF'
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: academic_portal
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./schema.sql:/docker-entrypoint-initdb.d/01_schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
EOF

echo -e "\n${G}✅ Academic Portal initialized successfully!${NC}"