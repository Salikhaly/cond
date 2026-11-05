const baseUrl='http://127.0.0.1:'+Number(process.env.COND_TEST_PORT||3001);
const {
  randomUUID
} = require('crypto');
module.exports = async ({
  call,
  check,
  admin,
  firm,
  worker,
  dash
}) => {
  const date = '2026-10-28',
    rep = await call(firm, '/operations/me');
  const employee = await call(admin, '/operations/users', {
    name: 'Возвраты · кондитер',
    email: 'returns-worker@local.test',
    password: 'Local2026!demo',
    role: 'employee'
  });
  const material = await call(admin, '/operations/materials', {
      name: 'Возвраты · материал',
      unit: 'кг'
    }),
    product = await call(admin, '/operations/products', {
      name: 'Возвраты · печенье',
      weight: 1,
      priceForEmployee: 10
    });
  await call(admin, '/operations/receipts', {
    date,
    supplier: 'Return fixture',
    document: 'RETURN-RAW',
    paid: false,
    lines: [{
      materialId: material.id,
      quantity: 100,
      unitCost: 10
    }]
  });
  await call(admin, '/operations/recipes', {
    productId: product.id,
    outputKg: 1,
    priceForEmployee: 10,
    overhead: 0,
    lines: [{
      materialId: material.id,
      quantity: 1
    }]
  });
  const p = await call(admin, '/operations/productions', {
    productId: product.id,
    workerId: employee.id,
    kg: 50,
    date
  });
  await call(admin, '/operations/productions/' + p.id + '/post', {});
  const shop = await call(admin, '/operations/outlets', {
    name: 'Возвраты · первый магазин',
    customerName: 'Возвраты · сеть',
    address: 'Тест 1',
    representativeId: rep.id
  });
  const shop2 = await call(admin, '/operations/outlets', {
    name: 'Возвраты · второй магазин',
    customerId: shop.customerId,
    address: 'Тест 2',
    representativeId: rep.id
  });
  const other = await call(admin, '/operations/outlets', {
    name: 'Возвраты · чужой клиент',
    customerName: 'Возвраты · другой клиент',
    address: 'Тест 3',
    representativeId: rep.id
  });
  const ship = async (outletId, kg = 2, price = 100) => {
    const o = await call(firm, '/operations/orders', {
      outletId,
      lines: [{
        productId: product.id,
        kg
      }],
      deliveryDate: date
    });
    await call(admin, '/operations/orders/' + o.id, {
      status: 'approved',
      prices: [price]
    }, 'PATCH');
    return call(admin, '/operations/orders/' + o.id, {
      status: 'shipped'
    }, 'PATCH');
  };
  const sale = await ship(shop.id, 10),
    before = await dash(),
    kg = () => dash().then(d => Number(d.products.find(p => p.id === product.id).kg));
  const body = {
    orderId: sale.id,
    contactName: 'Демо Клиент',
    reason: 'Повреждена упаковка',
    preferredSettlement: 'credit',
    lines: [{
      productId: product.id,
      kg: 5
    }]
  };
  await call(worker, '/operations/returns', body, 'POST', 403);
  const r = await call(firm, '/operations/returns', body);
  check(r.status === 'requested' && (await kg()) === 40, 'Returns: representative submits request without changing stock');
  await call(firm, '/operations/returns/' + r.id + '/post', {
    received: true,
    decisions: [{
      productId: product.id,
      kind: 'sale'
    }]
  }, 'POST', 403);
  await call(admin, '/operations/returns/' + r.id + '/post', {
    received: false,
    decisions: [{
      productId: product.id,
      kind: 'sale'
    }]
  }, 'POST', 400);
  check((await kg()) === 40, 'Returns: only administrator can confirm actual receipt');
  await call(admin, '/operations/returns/' + r.id + '/post', {
    received: true,
    decisions: [{
      productId: product.id,
      kind: 'inspection'
    }]
  });
  check((await kg()) === 40, 'Returns: inspection goods do not become saleable inventory');
  await call(admin, '/operations/returns/' + r.id + '/post', {
    received: true,
    decisions: [{
      productId: product.id,
      kind: 'sale'
    }]
  }, 'POST', 400);
  await call(admin, '/operations/returns/' + r.id + '/resolve', {
    productId: product.id,
    kind: 'sale',
    kg: 2,
    reason: 'Проверили, упаковка восстановлена'
  });
  await call(admin, '/operations/returns/' + r.id + '/resolve', {
    productId: product.id,
    kind: 'scrap',
    kg: 3,
    reason: 'Брак, в продажу нельзя'
  });
  check((await kg()) === 42, 'Returns: inspected 2 kg restocked; 3 kg scrap never enter free stock');
  await call(admin, '/operations/returns/' + r.id + '/resolve', {
    productId: product.id,
    kind: 'sale',
    kg: 1,
    reason: 'Повтор'
  }, 'POST', 400);
  await call(firm, '/operations/returns/' + r.id + '/settle', {
    kind: 'refund',
    amount: 1,
    confirmed: true,
    reference: 'Forbidden'
  }, 'POST', 403);
  const refundId = randomUUID();
  const sendRefund = () => fetch(baseUrl+'/api/operations/returns/' + r.id + '/settle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + admin,
      'X-Operation-Id': refundId
    },
    body: JSON.stringify({
      kind: 'refund',
      amount: 100,
      confirmed: true,
      reference: 'Выдано наличными по кассе ДЕМО-1'
    })
  }).then(async response => {
    if (!response.ok) throw Error(await response.text());
    return response.json();
  });
  const [refund, refundAgain] = await Promise.all([sendRefund(), sendRefund()]);
  check(refund.id === refundAgain.id, 'Returns: repeated money confirmation creates one settlement and one cash expense');
  await call(admin, '/operations/returns/' + r.id + '/settle', {
    kind: 'debt',
    amount: 100,
    confirmed: true,
    reference: 'Уменьшение долга подтверждено владельцем'
  });
  const credit = await call(admin, '/operations/returns/' + r.id + '/settle', {
    kind: 'credit',
    amount: 300,
    confirmed: true,
    reference: 'Зачёт следующих поставок'
  });
  let d = await dash();
  check(Number(d.outcomes.find(o => o.id === refund.outcomeId).totalAmount) === 100 && d.returns.find(x => x.id === r.id).settlements.length === 3, 'Returns: cash refund posts once as expense; debt and future credit recorded separately');
  await call(admin, '/operations/returns/' + r.id + '/settle', {
    kind: 'refund',
    amount: 1,
    confirmed: true,
    reference: 'Сверх суммы'
  }, 'POST', 400);
  const future = await ship(shop2.id, 2),
    wrong = await ship(other.id, 1);
  await call(admin, '/operations/return-credits/' + credit.id + '/apply', {
    orderId: wrong.id,
    amount: 1,
    confirmed: true,
    reference: 'Нельзя'
  }, 'POST', 400);
  await call(admin, '/operations/return-credits/' + credit.id + '/apply', {
    orderId: future.id,
    amount: 200,
    confirmed: true,
    reference: 'В счёт следующей накладной'
  });
  check((await dash()).returns.find(x => x.id === r.id).settlements.find(s => s.id === credit.id).uses.length === 1, 'Returns: company credit applies to next invoice of another shop in same network');
  await call(admin, '/operations/return-credits/' + credit.id + '/apply', {
    orderId: future.id,
    amount: 1,
    confirmed: true,
    reference: 'Дважды'
  }, 'POST', 400);
  await call(firm, '/operations/returns', {
    ...body,
    lines: [{
      productId: product.id,
      kg: 6
    }]
  }, 'POST', 400);
  const a = await call(firm, '/operations/returns', {
      ...body,
      lines: [{
        productId: product.id,
        kg: 4
      }]
    }),
    b = await call(firm, '/operations/returns', {
      ...body,
      lines: [{
        productId: product.id,
        kg: 3
      }]
    });
  const post = id => fetch(baseUrl+'/api/operations/returns/' + id + '/post', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + admin,
      'X-Operation-Id': randomUUID()
    },
    body: JSON.stringify({
      received: true,
      decisions: [{
        productId: product.id,
        kind: 'scrap'
      }]
    })
  });
  const race = await Promise.all([post(a.id), post(b.id)]);
  check(race.filter(r => r.status === 200).length === 1 && race.filter(r => r.status === 400).length === 1, 'Returns: competing requests cannot return more than original shipment');
  const exchangeSource = await ship(shop.id, 2),
    exchange = await call(firm, '/operations/returns', {
      ...body,
      orderId: exchangeSource.id,
      lines: [{
        productId: product.id,
        kg: 1
      }],
      replacements: [{
        productId: product.id,
        kg: 1000
      }]
    });
  const stockBefore = await kg();
  await call(admin, '/operations/returns/' + exchange.id + '/post', {
    received: true,
    decisions: [{
      productId: product.id,
      kind: 'sale'
    }],
    prices: [100]
  }, 'POST', 400);
  d = await dash();
  check((await kg()) === stockBefore && d.returns.find(x => x.id === exchange.id).status === 'requested' && !d.returns.find(x => x.id === exchange.id).dispositions.length, 'Returns: failed exchange rolls back receipt, dispositions and replacement shipment');
  await call(admin, '/operations/returns/' + exchange.id + '/cancel', {
    reason: 'Выбрано неверное количество замены'
  });
  const good = await call(firm, '/operations/returns', {
    ...body,
    orderId: exchangeSource.id,
    lines: [{
      productId: product.id,
      kg: 1
    }],
    replacements: [{
      productId: product.id,
      kg: 2
    }]
  });
  const posted = await call(admin, '/operations/returns/' + good.id + '/post', {
    received: true,
    decisions: [{
      productId: product.id,
      kind: 'scrap'
    }],
    prices: [120]
  });
  d = await dash();
  check(Number(d.orders.find(o => o.id === posted.exchangeOrderId)?.total) === 240 && (await kg()) === stockBefore - 2, 'Returns: exchange creates linked shipped invoice at approved prices, original remains unchanged');
  const tinySale = await ship(shop.id, 1, .01);
  for (let i = 0; i < 2; i++) {
    const tiny = await call(firm, '/operations/returns', {
      ...body,
      orderId: tinySale.id,
      lines: [{
        productId: product.id,
        kg: .5
      }]
    });
    await call(admin, '/operations/returns/' + tiny.id + '/post', {
      received: true,
      decisions: [{
        productId: product.id,
        kind: 'scrap'
      }]
    });
  }
  d = await dash();
  check(d.returns.filter(r => r.orderId === tinySale.id && r.status === 'posted').reduce((s, r) => s + Number(r.total), 0) === .01, 'Returns: partial fractional returns cannot refund more than rounded original price');
  const creditInvoice=await ship(shop.id,1);
  const useCredit=()=>fetch(baseUrl+'/api/operations/return-credits/'+credit.id+'/apply',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+admin,'X-Operation-Id':randomUUID()},body:JSON.stringify({orderId:creditInvoice.id,amount:100,confirmed:true,reference:'Проверка одновременного зачёта'})});
  const creditRace=await Promise.all([useCredit(),useCredit()]);
  check(creditRace.filter(r=>r.status===200).length===1&&creditRace.filter(r=>r.status===400).length===1,'Returns: concurrent credit applications cannot spend the same balance twice');
  const separate=await call(admin,'/operations/outlets',{name:'Возвраты · отдельный 1',customerName:'Возвраты · раздельный долг',debtScope:'outlet',address:'Тест 4',representativeId:rep.id});
  const separate2=await call(admin,'/operations/outlets',{name:'Возвраты · отдельный 2',customerId:separate.customerId,address:'Тест 5',representativeId:rep.id});
  const separateSale=await ship(separate.id,1),sr=await call(firm,'/operations/returns',{...body,orderId:separateSale.id,lines:[{productId:product.id,kg:.5}]});
  await call(admin,'/operations/returns/'+sr.id+'/post',{received:true,decisions:[{productId:product.id,kind:'scrap'}]});
  const sc=await call(admin,'/operations/returns/'+sr.id+'/settle',{kind:'credit',amount:50,confirmed:true,reference:'Раздельный зачёт магазина'});
  const separateFuture=await ship(separate2.id,1);await call(admin,'/operations/return-credits/'+sc.id+'/apply',{orderId:separateFuture.id,amount:50,confirmed:true,reference:'Не тот магазин'},'POST',400);
  const correctFuture=await ship(separate.id,1);await call(admin,'/operations/return-credits/'+sc.id+'/apply',{orderId:correctFuture.id,amount:50,confirmed:true,reference:'Тот же магазин'});
  check(true,'Returns: separate outlet credit cannot cross stores in the same company');
  check((await call(admin, '/operations/reconciliation')).ok, 'Returns: stock, reservations, returns, cash refunds, credits and original ledgers reconcile');
  check(d.payroll.filter(s => s.userId === employee.id).reduce((n, s) => n + Number(s.total_amount), 0) === before.payroll.filter(s => s.userId === employee.id).reduce((n, s) => n + Number(s.total_amount), 0), 'Returns: goods returns do not reverse employee wages');
  check(d.orders.find(o => o.id === sale.id).lines[0].kg === 10 && Number(d.orders.find(o => o.id === sale.id).total) === 1000, 'Returns: original shipment quantities and prices remain unchanged');
  check(!(await call(worker, '/operations/dashboard')).returns, 'Returns: employee cannot read buyer returns or money settlements');
  check(d.returns.find(x => x.id === r.id).events.length >= 6, 'Returns: requested, received, inspections and settlements retain immutable history');
};
