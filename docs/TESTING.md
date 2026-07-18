# Testing Guide

## Frontend Verification
Run the standard verification checks:
```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

## Backend Testing
Ensure the testing environment variables are set (see `SEED.md` for test account setup).
```bash
cd backend
pytest tests/ -v
```

## End-to-End Tests
Playwright tests are configured for the frontend.
```bash
cd frontend
npx playwright test
```
