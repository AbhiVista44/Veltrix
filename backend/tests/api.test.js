import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';

let server;
let baseUrl;
let adminToken;
let staffToken;
let staffUserId;
let categoryId;
let supplierId;
let productId;

const TEST_DB_URI =
  process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/veltrix_inventory_test';

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  return { status: res.status, data };
}

before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_ENABLED = 'true';
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');

  await mongoose.connect(TEST_DB_URI);
  await mongoose.connection.dropDatabase();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Veltrix Inventory Management System API', () => {
  it('reports root & health status and blocks unauthenticated access when AUTH_ENABLED=true', async () => {
    const rootRes = await fetch(baseUrl.replace(/\/api$/, '/'));
    assert.equal(rootRes.status, 200);
    const rootData = await rootRes.json();
    assert.equal(rootData.status, 'ok');
    assert.equal(rootData.health, '/api/health');

    const health = await api('/health');
    assert.equal(health.status, 200);
    assert.equal(health.data.database, 'connected');
    assert.equal(health.data.authEnabled, true);

    const statusBefore = await api('/auth/status');
    assert.equal(statusBefore.status, 200);
    assert.equal(statusBefore.data.data.hasUsers, false);

    const unauthProducts = await api('/products');
    assert.equal(unauthProducts.status, 401);
  });

  it('allows initial Admin setup once, enforces login, and sanitizes operator injection', async () => {
    const setup = await api('/auth/setup', {
      method: 'POST',
      body: {
        name: 'System Admin',
        email: 'admin@veltrix.test',
        password: 'AdminPassword123!',
      },
    });
    assert.equal(setup.status, 201);
    assert.equal(setup.data.data.user.role, 'admin');
    assert.ok(setup.data.data.token);

    const secondSetup = await api('/auth/setup', {
      method: 'POST',
      body: {
        name: 'Rogue Admin',
        email: 'rogue@veltrix.test',
        password: 'Password123!',
      },
    });
    assert.equal(secondSetup.status, 403);

    const injectionAttempt = await api('/auth/login', {
      method: 'POST',
      body: {
        email: { $ne: '' },
        password: 'AdminPassword123!',
      },
    });
    assert.equal(injectionAttempt.status, 400);

    const loginRes = await api('/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@veltrix.test',
        password: 'AdminPassword123!',
      },
    });
    assert.equal(loginRes.status, 200);
    adminToken = loginRes.data.data.token;
  });

  it('creates Staff user, verifies RBAC boundaries, and manages master data CRUD', async () => {
    const createStaff = await api('/users', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Staff Operator',
        email: 'staff@veltrix.test',
        password: 'StaffPassword123!',
        role: 'staff',
      },
    });
    assert.equal(createStaff.status, 201);
    staffUserId = createStaff.data.data._id;

    const staffLogin = await api('/auth/login', {
      method: 'POST',
      body: {
        email: 'staff@veltrix.test',
        password: 'StaffPassword123!',
      },
    });
    assert.equal(staffLogin.status, 200);
    staffToken = staffLogin.data.data.token;

    // Staff cannot view /users
    const staffUsersAttempt = await api('/users', { token: staffToken });
    assert.equal(staffUsersAttempt.status, 403);

    // Create category & supplier
    const cat = await api('/categories', {
      method: 'POST',
      token: staffToken,
      body: { name: 'Peripherals', description: 'Keyboards and mice' },
    });
    assert.equal(cat.status, 201);
    categoryId = cat.data.data._id;

    const dupCat = await api('/categories', {
      method: 'POST',
      token: staffToken,
      body: { name: 'peripherals' },
    });
    assert.equal(dupCat.status, 409);

    const sup = await api('/suppliers', {
      method: 'POST',
      token: staffToken,
      body: {
        name: 'Apex Gear Ltd',
        contactPerson: 'Nina Rao',
        email: 'orders@apexgear.test',
        phone: '555-0188',
      },
    });
    assert.equal(sup.status, 201);
    supplierId = sup.data.data._id;

    // Create product with opening stock
    const prod = await api('/products', {
      method: 'POST',
      token: staffToken,
      body: {
        name: 'Wireless Mouse',
        sku: 'PR-101',
        category: categoryId,
        supplier: supplierId,
        price: 45,
        quantity: 20,
        reorderLevel: 10,
        unit: 'pcs',
      },
    });
    assert.equal(prod.status, 201);
    productId = prod.data.data._id;

    // Staff cannot delete products/categories/suppliers
    const staffDeleteProd = await api(`/products/${productId}`, {
      method: 'DELETE',
      token: staffToken,
    });
    assert.equal(staffDeleteProd.status, 403);
  });

  it('handles atomic stock movements, negative stock guards, loss tracking, and user attribution', async () => {
    const stockOut = await api('/inventory/movements', {
      method: 'POST',
      token: staffToken,
      body: {
        product: productId,
        type: 'stock_out',
        quantity: 12,
        reason: 'Order fulfillment',
        reference: 'SO-200',
      },
    });
    assert.equal(stockOut.status, 201);
    assert.equal(stockOut.data.data.product.quantity, 8);
    assert.equal(
      stockOut.data.data.movement.performedBy,
      'Staff Operator (staff)'
    );

    // Concurrent race condition test: two 6-unit deductions when 8 left -> 1 succeeds, 1 fails
    const [r1, r2] = await Promise.all([
      api('/inventory/movements', {
        method: 'POST',
        token: staffToken,
        body: { product: productId, type: 'stock_out', quantity: 6 },
      }),
      api('/inventory/movements', {
        method: 'POST',
        token: staffToken,
        body: { product: productId, type: 'stock_out', quantity: 6 },
      }),
    ]);
    assert.deepEqual([r1.status, r2.status].sort(), [201, 400]);

    // Damage tracking & adjustment
    const dmg = await api('/inventory/movements', {
      method: 'POST',
      token: staffToken,
      body: {
        product: productId,
        type: 'damaged',
        quantity: 1,
        reason: 'Water damage in receiving bay',
      },
    });
    assert.equal(dmg.status, 201);
    assert.equal(dmg.data.data.product.quantity, 1);

    const adj = await api('/inventory/movements', {
      method: 'POST',
      token: adminToken,
      body: {
        product: productId,
        type: 'adjustment',
        adjustmentMode: 'set',
        newQuantity: 5,
        reason: 'Physical cycle recount',
      },
    });
    assert.equal(adj.status, 201);
    assert.equal(adj.data.data.product.quantity, 5);
  });

  it('returns accurate analytics, alerts, notifications, and advanced product filtering', async () => {
    const overview = await api('/analytics/overview?days=7', { token: staffToken });
    assert.equal(overview.status, 200);
    assert.equal(overview.data.data.valuation.totalValuation, 225);
    assert.equal(overview.data.data.stockTrends.length, 7);

    const alerts = await api('/analytics/alerts', { token: staffToken });
    assert.equal(alerts.status, 200);
    assert.equal(alerts.data.data.summary.lowStockCount, 1);

    const notifs = await api('/analytics/notifications', { token: staffToken });
    assert.equal(notifs.status, 200);
    assert.ok(notifs.data.data.unreadCount >= 2);

    const filtered = await api('/products?minPrice=40&maxPrice=50&unit=pcs', {
      token: staffToken,
    });
    assert.equal(filtered.status, 200);
    assert.equal(filtered.data.data.length, 1);
  });

  it('enforces admin user management safeguards and master-data delete guards', async () => {
    // Deactivating staff user immediately invalidates their token
    const deactivate = await api(`/users/${staffUserId}`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'inactive' },
    });
    assert.equal(deactivate.status, 200);

    const deactivatedReq = await api('/products', { token: staffToken });
    assert.equal(deactivatedReq.status, 401);

    // Admin cannot delete category while product references it
    const catDeleteGuard = await api(`/categories/${categoryId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(catDeleteGuard.status, 409);

    // Admin deletes product, then category and supplier cleanly
    const delProd = await api(`/products/${productId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(delProd.status, 200);

    const delCat = await api(`/categories/${categoryId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    const delSup = await api(`/suppliers/${supplierId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(delCat.status, 200);
    assert.equal(delSup.status, 200);
  });
});
