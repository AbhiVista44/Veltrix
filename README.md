# Veltrix — Inventory Management System

A full-stack SaaS Inventory Management System built with React, Vite, Tailwind CSS, Node.js, Express, and MongoDB Atlas. Designed for tracking products, categories, suppliers, atomic stock movements, loss/damage auditing, valuation analytics, reorder alerts, notifications, and role-based access control.

---

## Tech Stack

- **Frontend**: React 19, Vite, JavaScript, Tailwind CSS v4, React Router, Axios, Lucide React, Recharts, React Toastify
- **Backend**: Node.js, Express 5, Mongoose, Helmet, CORS, Express Rate Limit, Morgan
- **Database**: MongoDB Atlas (supports both `mongodb+srv://` and legacy `mongodb://` strings)
- **Authentication (Optional)**: JWT (`jsonwebtoken`) + `bcryptjs` with `Admin` and `Staff` roles
- **Deployment**: Frontend on **Vercel**, Backend on **Render** (free-tier compatible)

---

## Key Features

### Milestone 1 — Foundation & Master Data
- **Product Catalog CRUD**: Name, unique uppercase SKU, category, supplier, unit price, stock quantity, reorder level, unit, status.
- **Category & Supplier CRUD**: Linked product counts and `409 Conflict` delete guards to prevent orphan references.
- **Querying**: Debounced search, multi-facet filters, allowlisted column sorting, and server-side pagination.

### Milestone 2 — Inventory Operations & Audit Trail
- **Stock Operations**: Stock In, Stock Out, Adjustments (`Set Physical Count` or `Adjust By +/-`), and loss tracking (`Damaged`, `Expired`, `Wasted`).
- **Negative Stock Protection**: Atomic conditional MongoDB updates (`quantity >= deduct`) prevent negative stock even under concurrent requests.
- **Immutable Audit Trail**: Every movement records `previousQuantity`, `quantityDelta`, `newQuantity`, `unitPriceSnapshot`, `totalValue`, `productSnapshot`, `reason`, `reference`, and `performedBy`.

### Milestone 3 — Analytics, Alerts & Notification Center
- **Valuation & Trends**: Total/healthy/at-risk inventory valuation, category valuation breakdown, top-valued products, and zero-filled `7D / 14D / 30D / 90D` Stock-In vs Stock-Out Recharts visualizations.
- **Alerts & Reorder Suggestions**: Out-of-stock & low-stock alerts with 30-day outflow velocity, suggested reorder quantities, supplier contacts, and one-click replenishment.
- **Notification Center**: Bell popover in navbar with DB-persisted read state (`NotificationRead`).
- **Advanced Product Filters**: Price range (`minPrice`/`maxPrice`), stock quantity range (`minQty`/`maxQty`), and unit filters.

### Milestone 4 — Security, Testing & Deployment
- **Optional JWT Auth & RBAC**: Controlled by `AUTH_ENABLED=true|false`. First-time setup creates the initial Admin; Admins manage `Admin`/`Staff` users and destructive deletions, while Staff handle operations and catalog edits.
- **Security Hardening**: `helmet`, `express-rate-limit`, Express 5-safe NoSQL body sanitization (`sanitizeBody`), `trust proxy`, and strict CORS origin allowlisting.
- **Automated Tests & Deployment Configs**: `node --test` integration suite, `frontend/vercel.json`, and `render.yaml`.

---

## Project Structure

```text
Veltrix/
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── tests/api.test.js
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/db.js
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── utils/
├── frontend/
│   ├── .env.example
│   ├── package.json
│   ├── vercel.json
│   ├── vite.config.js
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/AuthContext.jsx
│       ├── hooks/
│       ├── pages/
│       └── utils/
├── docs/API.md
├── render.yaml
└── README.md
```

---

## Local Setup

### 1. Prerequisites
- Node.js 20+ (tested on Node v24)
- A MongoDB Atlas cluster (or local MongoDB server)

### 2. Backend Configuration
```bash
cd backend
npm install
```
Copy `backend/.env.example` to `backend/.env` and configure:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/veltrix_inventory?retryWrites=true&w=majority
AUTH_ENABLED=true
JWT_SECRET=<replace-with-random-64-char-hex-secret>
JWT_EXPIRES_IN=7d
```
> Set `AUTH_ENABLED=false` if you want open-access mode without login prompts.

Start the backend API:
```bash
npm run dev
```

### 3. Frontend Configuration
```bash
cd frontend
npm install
```
Copy `frontend/.env.example` to `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```
Start the Vite dev server:
```bash
npm run dev
```
Open `http://localhost:5173`. On first launch with `AUTH_ENABLED=true`, the workspace prompts you to create your initial **Admin** account.

---

## Running Tests

Run the backend API, RBAC, concurrency, and analytics integration test suite (requires local MongoDB or set `MONGO_URI_TEST` to a dedicated test database):
```bash
cd backend
npm test
```

Build the production frontend bundle:
```bash
cd frontend
npm run build
```

---

## Deployment Guide (Render + Vercel)

### 1. Deploy Backend to Render (Free Tier)
1. Push this repository to GitHub.
2. In Render, click **New + → Blueprint** (uses `render.yaml`) or **New Web Service**:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
3. Set Environment Variables in Render:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: Your MongoDB Atlas connection string (ensure Render egress / `0.0.0.0/0` is allowed in MongoDB Atlas **Network Access**)
   - `AUTH_ENABLED`: `true` (or `false`)
   - `JWT_SECRET`: Strong random secret (auto-generated when using `render.yaml`)
   - `CLIENT_URL`: Your Vercel production URL, e.g. `https://veltrix-inventory.vercel.app` (comma-separate multiple origins if needed)
4. Copy your deployed Render service URL (e.g. `https://veltrix-inventory-api.onrender.com`).

### 2. Deploy Frontend to Vercel (Free Tier)
1. In Vercel, import the same GitHub repository:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
2. Add Environment Variable in Vercel:
   - `VITE_API_URL`: `https://veltrix-inventory-api.onrender.com/api`
3. Deploy! (`frontend/vercel.json` ensures client-side React Router routes resolve cleanly on refresh.)
4. Ensure your Render `CLIENT_URL` matches your final Vercel URL (no trailing slash needed).

---

## API Documentation

See [docs/API.md](docs/API.md) for full endpoint documentation, query parameters, payloads, and status codes.
