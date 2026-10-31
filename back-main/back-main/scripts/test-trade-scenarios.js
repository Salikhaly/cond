const {
    Client
  } = require('pg'),
  {
    spawn
  } = require('node:child_process'),
  path = require('path');
module.exports = async ({
  call,
  check,
  admin,
  firm,
  second,
  worker,
  d,
  dash,
  product,
  database
}) => {
  const rep = await call(firm, '/operations/me'),
    other = await call(second, '/operations/me');
  const shopA = await call(admin, '/operations/outlets', {
    customerName: 'Сеть магазинов',
    debtScope: 'company',
    name: 'Центр',
    address: 'Центральная, 1',
    representativeId: rep.id
  });
  const shopB = await call(admin, '/operations/outlets', {
    customerId: shopA.customerId,
    name: 'Север',
    address: 'Северная, 2',
    representativeId: rep.id
  });
  const independent = await call(admin, '/operations/outlets', {
    customerName: 'Независимый клиент',
    debtScope: 'outlet',
    name: 'У дома',
    address: 'Новая, 3',
    representativeId: other.id
  });
  const view = await call(firm, '/operations/dashboard');
  check(view.outlets.length === 2 && view.customers.length === 1 && !view.outlets.some(o => o.id === independent.id), 'Sales representative sees assigned shops, not other customers');
  await call(firm, '/operations/outlets', {}, 'POST', 403);
  await call(worker, '/operations/outlets', {}, 'POST', 403);
  await call(firm, '/operations/orders', {
    outletId: independent.id,
    lines: [{
      productId: product.id,
      kg: 1
    }],
    deliveryDate: d
  }, 'POST', 403);
  check(true, 'Shop administration and foreign outlet orders are protected');
  const before = Number((await dash()).products.find(p => p.id === product.id).availableKg);
  const future = await call(firm, '/operations/orders', {
    outletId: shopA.id,
    company: 'Spoof',
    lines: [{
      productId: product.id,
      kg: 1000
    }],
    deliveryDate: d
  });
  const saved = (await dash()).orders.find(o => o.id === future.id);
  check(saved.company === 'Сеть магазинов' && saved.destination.address === 'Центральная, 1', 'Order snapshots trusted customer, outlet and address');
  check(Number((await dash()).products.find(p => p.id === product.id).availableKg) === before, 'Future production order does not reserve existing stock');
  await call(admin, '/operations/orders/' + future.id, {
    status: 'approved',
    prices: [2000]
  }, 'PATCH', 400);
  await call(admin, '/operations/orders/' + future.id, {
    status: 'cancelled'
  }, 'PATCH');
  check(Number((await dash()).products.find(p => p.id === product.id).availableKg) === before, 'Insufficient approval and cancellation of a pending order leave stock unchanged');
  const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
  await call(admin, '/operations/products/' + product.id + '/display', {
    description: 'Описание для магазина',
    photo
  }, 'PATCH');
  const p = (await call(firm, '/operations/dashboard')).products.find(p => p.id === product.id);
  check(p.photo === photo && p.description === 'Описание для магазина' && !('priceForEmployee' in p), 'Catalogue exposes photos and descriptions without payroll rates');
  await call(firm, '/operations/products/' + product.id + '/display', {
    photo: ''
  }, 'PATCH', 403);
  await call(admin, '/operations/products/' + product.id + '/display', {
    photo: 'data:image/svg+xml;base64,PHN2Zz4='
  }, 'PATCH', 400);
  await call(admin, '/operations/products/' + product.id + '/display', {
    photo: 'data:image/png;base64,' + Buffer.from('invalid-image-header-at-least-24-bytes').toString('base64')
  }, 'PATCH', 400);
  check(true, 'Only administrator uploads photos; SVG and fake image headers are rejected');
  const approved = await call(firm, '/operations/orders', {
    outletId: shopB.id,
    lines: [{
      productId: product.id,
      kg: 2
    }],
    deliveryDate: d
  });
  await call(admin, '/operations/orders/' + approved.id, {
    status: 'approved',
    prices: [2100]
  }, 'PATCH');
  const pending = await call(firm, '/operations/orders', {
    outletId: shopA.id,
    lines: [{
      productId: product.id,
      kg: 3
    }],
    deliveryDate: d
  });
  const pg = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database
  });
  await pg.connect();
  await pg.query('UPDATE finished_stocks SET "reservedKg"="reservedKg"+3 WHERE "productId"=$1', [product.id]);
  await pg.query('DELETE FROM operations_legacy_links WHERE id=$1', ['reserve-on-approval:v1']);
  await pg.end();
  const migrate = () => new Promise((resolve, reject) => {
    let log = '';
    const child = spawn(process.execPath, ['-e', "require('dotenv').config();process.env.TELEGRAM_ENABLED='false';const db=require('./src/database/sequelize');require('./src/models/models');require('./src/models/operations');require('./src/database/upgradeOperations')().then(()=>db.close()).catch(e=>{console.error(e);process.exitCode=1;return db.close()})"], {
      cwd: path.resolve(__dirname, '..'),
      windowsHide: true,
      env: {
        ...process.env,
        DB_NAME: database,
        LOCAL_DEMO: 'true'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', b => log += b);
    child.stderr.on('data', b => log += b);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(log)));
  });
  await migrate();
  check(Number((await dash()).products.find(p => p.id === product.id).reservedKg) === 2, 'Migration frees historical pending reserves and preserves approved reserves');
  await migrate();
  check(Number((await dash()).products.find(p => p.id === product.id).reservedKg) === 2, 'Reserve migration remains stable on repeated startup');
  await call(admin, '/operations/outlets/' + shopA.id, {
    representativeId: other.id
  }, 'PATCH');
  check(!(await call(firm, '/operations/dashboard')).outlets.some(o => o.id === shopA.id) && (await call(second, '/operations/dashboard')).outlets.some(o => o.id === shopA.id), 'Reassignment changes shop access immediately');
  check((await dash()).orders.find(o => o.id === pending.id).destination.address === 'Центральная, 1', 'Order history keeps the original destination after reassignment');
  await call(admin, '/operations/orders/' + approved.id, {
    status: 'shipped'
  }, 'PATCH');
  const shopSale = (await dash()).incomes.find(s => s.destination?.orderId === approved.id);
  check(shopSale?.destination.outletId === shopB.id && shopSale.destination.customerId === shopB.customerId && Number(shopSale.totalWeight) === 2, 'Shipment analytics preserves the exact shop and customer');
  check((await call(admin, '/operations/reconciliation')).ok, 'Trade orders, approval reserves, invoices and legacy sales reconcile');
};
