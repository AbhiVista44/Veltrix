# Veltrix Inventory API Reference

Base URL:
- Local: `http://localhost:5000/api`
- Production: `https://<your-render-service>.onrender.com/api`

When `AUTH_ENABLED=true`, protected routes require:
```http
Authorization: Bearer <jwt-token>
```

---

## Health

### `GET /health`
Public health check for uptime monitoring and Render readiness probes.
- **Response (`200`)**:
```json
{
  "success": true,
  "status": "ok",
  "database": "connected",
  "authEnabled": true,
  "timestamp": "2026-11-25T12:00:00.000Z"
}
```

---

## Authentication (`/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/auth/status` | Public | Returns `{ authEnabled, hasUsers }` |
| `POST` | `/auth/setup` | Public (first user only) | Creates initial `admin` user when DB has `0` users (`403` afterwards) |
| `POST` | `/auth/login` | Public | Authenticates `email` & `password`; returns `{ token, user }` |
| `GET` | `/auth/me` | Protected | Returns current authenticated user profile |
| `PUT` | `/auth/password` | Protected | Updates signed-in user's password (`currentPassword`, `newPassword`) |

---

## Users & Roles (`/users`) — Admin Only

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/users` | Admin | Paginated list (`search`, `role`, `status`, `page`, `limit`) |
| `POST` | `/users` | Admin | Create new `admin` or `staff` account (`name`, `email`, `password`, `role`) |
| `PATCH` | `/users/:id` | Admin | Update `name`, `role`, or `status` (self-deactivation/demotion blocked) |

---

## Categories (`/categories`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/categories` | Protected | List with `productCount` (`search`, `status`, `sortBy`, `sortOrder`, `page`, `limit`, `all=true`) |
| `GET` | `/categories/:id` | Protected | Get single category with `productCount` |
| `POST` | `/categories` | Protected | Create category (`name`, `description`, `status`) |
| `PUT` | `/categories/:id` | Protected | Update category |
| `DELETE` | `/categories/:id` | Admin | Delete category (`409` if products reference it) |

---

## Suppliers (`/suppliers`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/suppliers` | Protected | List with `productCount` (`search`, `status`, `sortBy`, `sortOrder`, `page`, `limit`, `all=true`) |
| `GET` | `/suppliers/:id` | Protected | Get single supplier with `productCount` |
| `POST` | `/suppliers` | Protected | Create supplier (`name`, `contactPerson`, `email`, `phone`, `address`, `status`) |
| `PUT` | `/suppliers/:id` | Protected | Update supplier |
| `DELETE` | `/suppliers/:id` | Admin | Delete supplier (`409` if products reference it) |

---

## Products (`/products`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | Protected | Paginated catalog with `search`, `category`, `supplier`, `stockStatus` (`in_stock`, `low_stock`, `out_of_stock`), `status`, `unit`, `minPrice`, `maxPrice`, `minQty`, `maxQty`, `sortBy`, `sortOrder`, `all=true` |
| `GET` | `/products/:id` | Protected | Get product details |
| `POST` | `/products` | Protected | Create product (automatically logs opening `stock_in` movement when `quantity > 0`) |
| `PUT` | `/products/:id` | Protected | Update product (automatically logs `adjustment` movement if `quantity` changes) |
| `DELETE` | `/products/:id` | Admin | Delete product (preserves `StockMovement` snapshots) |

---

## Inventory Operations (`/inventory`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/inventory/summary` | Protected | Aggregated counts & units (`totalMovements`, `stockInUnits`, `stockOutUnits`, `adjustmentCount`, `damagedUnits`, `expiredUnits`, `wastedUnits`, `lossUnits`, `lossValue`) |
| `GET` | `/inventory/movements` | Protected | Paginated immutable audit log (`search`, `type` or `type=loss`, `product`, `startDate`, `endDate`, `sortBy`, `sortOrder`) |
| `POST` | `/inventory/movements` | Protected | Execute atomic movement (`type`: `stock_in`, `stock_out`, `adjustment`, `damaged`, `expired`, `wasted`). Prevents negative stock (`400`) |

### `POST /inventory/movements` Payload Example
```json
{
  "product": "6744b019c1a2b3d4e5f60708",
  "type": "stock_out",
  "quantity": 5,
  "reason": "Customer order #1042",
  "reference": "SO-1042",
  "notes": "Dispatched via ground courier"
}
```
For `type: "adjustment"`, pass either:
- `adjustmentMode: "set"` with `newQuantity` (integer `>= 0`), or
- `adjustmentMode: "delta"` with `quantityDelta` (non-zero integer).

---

## Dashboard & Analytics (`/dashboard`, `/analytics`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard/summary` | Protected | KPI summary, `categoryBreakdown`, `lowStockProducts`, `recentProducts`, `recentMovements` |
| `GET` | `/analytics/overview` | Protected | Valuation KPIs, continuous `stockTrends` (`days=7|14|30|90`), `categoryInsights`, `topValuedProducts`, `movementBreakdown` (filterable by `category` & `supplier`) |
| `GET` | `/analytics/alerts` | Protected | Low-stock/out-of-stock alerts with 30-day outflow velocity and reorder suggestions (`severity`, `category`, `supplier`, `status`, `search`) |
| `GET` | `/analytics/notifications` | Protected | Live alert & recent-loss notifications with DB-persisted read state |
| `POST` | `/analytics/notifications/read` | Protected | Mark notification keys as read (`{ "keys": ["low_stock:..."] }`) |

---

## Error Format

All errors return structured JSON:
```json
{
  "success": false,
  "message": "Human-readable error summary",
  "errors": {
    "fieldName": "Specific validation message"
  }
}
```
Common status codes: `400` Validation / Insufficient stock, `401` Unauthorized, `403` Forbidden (RBAC / CORS), `404` Not Found, `409` Duplicate / Reference Conflict, `429` Rate Limit Exceeded.
