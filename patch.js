// DropPilot Master Patch - Run: node patch.js
const fs = require('fs');

if (!fs.existsSync('server.js')) {
  console.error('Run from droppilot-app folder!');
  process.exit(1);
}

let s = fs.readFileSync('server.js', 'utf8');
let h = fs.readFileSync('index.html', 'utf8');
let applied = 0, skipped = 0;

function patch(desc, find, replace, file) {
  let content = file === 'html' ? h : s;
  if (content.includes(replace.substring(0, 40))) { skipped++; return; }
  if (content.includes(find.substring(0, 40))) {
    if (file === 'html') h = h.replace(find, replace);
    else s = s.replace(find, replace);
    console.log('✅ ' + desc);
    applied++;
  } else {
    console.log('⚠️  Not found: ' + desc);
  }
}

function addVeRO(desc, anchor, brands) {
  const first = brands.split("'")[1];
  if (s.includes("'" + first + "'")) { skipped++; return; }
  if (s.includes(anchor)) {
    s = s.replace(anchor, brands + ',' + anchor);
    console.log('✅ VeRO: ' + desc);
    applied++;
  } else {
    console.log('⚠️  VeRO anchor not found: ' + desc);
  }
}

// ============================================================
// SERVER.JS
// ============================================================

// Fix broken loadOrders
var lo_start = s.indexOf('function loadOrders()');
var lo_end = s.indexOf('\nfunction ', lo_start + 1);
if (lo_end - lo_start > 200) {
  var fixed = "function loadOrders() {\n  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); }\n  catch(e) { return []; }\n}\n";
  s = s.substring(0, lo_start) + fixed + s.substring(lo_end);
  console.log('✅ Fixed broken loadOrders');
  applied++;
} else { skipped++; }

addVeRO('Brother, Canon, HP', "'brady ','brady m'", "'brother ','brother p-touch','epson ','canon printer','hp printer','brady ','brady m'");
addVeRO('Tripp Lite, Legrand', "'brady ','brady m'", "'tripp lite','legrand ','wiremold ','apc ','belkin ','eaton ','brady ','brady m'");
addVeRO('NOCO, jump starters', "'tripp lite'", "'noco ','noco boost','antigravity batteries','schumacher electric','tripp lite'");
addVeRO('GEARWRENCH, SKG', "'cole & mason'", "'gearwrench ','franklin sensors','skg ','bob and brad','cole & mason'");
addVeRO('Brady, UTK, Fellowes', "'marcato '", "'brady ','brady m','triggerpoint ','utk ','istim ','fellowes ','marcato '");
addVeRO('Coast, Petmate', "'brady '", "'coast flashlight','petmate ','brady '");
addVeRO('Lodge, Le Creuset', "'alessi '", "'lodge ','le creuset','staub ','all-clad ','calphalon ','zwilling ','wusthof ','victorinox ','alessi '");
addVeRO('Bose, JBL, Yamaha', "'tivoli audio'", "'bose ','sonos ','jbl ','harman kardon','sennheiser ','shure ','klipsch ','yamaha ','denon ','tivoli audio'");
addVeRO('Nike, Adidas', "'under armour'", "'nike ','adidas ','reebok ','puma ','new balance','asics ','under armour'");
addVeRO('Yeti, Hydro Flask', "'hydro flask'", "'hydro flask','hydroflask','yeti ','corkcicle ','stanley ','klean kanteen','camelbak ','hydro flask'");

patch('Trademark symbol check',
  "if (isVeRO(title, '')) return { pass: false, reason: 'VeRO brand detected' };",
  "if (isVeRO(title, '')) return { pass: false, reason: 'VeRO brand detected' };\n  if (title.includes('\u00ae') || title.includes('\u2122')) return { pass: false, reason: 'Trademark symbol detected' };"
);

patch('Slow shipping detection',
  "    // NOT PRIME\n    if (!isPrime) {",
  "    // SLOW SHIPPING\n    var dText=(p.product_availability||p.delivery||'').toLowerCase();\n    if(['august','september','october','3 to 4 weeks','4 to 6 weeks'].some(function(k){return dText.includes(k);})){\n      await cancelOrderWithMessage(order.orderId,'Item unavailable');\n      orders[orderIdx].status='Cancelled';saveOrders(orders);return;\n    }\n    // NOT PRIME\n    if (!isPrime) {"
);

// Install tracking system
if (!s.includes('uploadTrackingManual')) {
  var insertAt = s.indexOf("app.get('/api/");
  var trackCode = [
    '',
    'async function uploadTrackingToEbay(orderId, trackingNumber, carrier) {',
    '  try {',
    '    var accessToken = await getEbayAccessToken();',
    "    var carrierCode = carrier || 'Other';",
    "    var tn = (trackingNumber || '').toUpperCase();",
    "    if (tn.startsWith('1Z')) carrierCode = 'UPS';",
    "    else if (tn.match(/^(94|92|93|TBA)/)) carrierCode = 'USPS';",
    "    else if (tn.match(/^(61|7489)/)) carrierCode = 'FedEx';",
    "    var orderRes = await nodeFetch('https://api.ebay.com/sell/fulfillment/v1/order/' + orderId, {",
    "      headers: { 'Authorization': 'Bearer ' + accessToken, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' }",
    '    });',
    '    var orderData = await orderRes.json();',
    '    var lineItems = orderData.lineItems || [];',
    '    var lineItemId = lineItems.length > 0 ? lineItems[0].lineItemId : orderId.replace(/-/g,"");',
    "    var res = await nodeFetch('https://api.ebay.com/sell/fulfillment/v1/order/' + orderId + '/shipping_fulfillment', {",
    "      method: 'POST',",
    "      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json', 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' },",
    '      body: JSON.stringify({ lineItems: [{ lineItemId: lineItemId, quantity: 1 }], shippedDate: new Date().toISOString().split(".")[0]+".000Z", shippingCarrierCode: carrierCode, trackingNumber: trackingNumber }),',
    '      timeout: 15000',
    '    });',
    "    if (res.ok || res.status === 201) { console.log('[Tracking] Uploaded: '+trackingNumber+' for '+orderId); return {success:true}; }",
    '    var err = await res.text();',
    '    return {success:false, error:err};',
    '  } catch(e) { return {success:false, error:e.message}; }',
    '}',
    '',
    'async function uploadTrackingManual(orderId, trackingNumber, carrier) {',
    '  var orders = loadOrders();',
    "  console.log('[Tracking] Looking for:', orderId, 'in', orders.length, 'orders');",
    '  var idx = orders.findIndex(function(o){ return o.orderId === orderId; });',
    "  if (idx === -1) return {success:false, error:'Order not found - searched '+orders.length+' for '+orderId};",
    '  var result = await uploadTrackingToEbay(orderId, trackingNumber, carrier);',
    '  if (result.success) {',
    '    orders[idx].trackingNumber = trackingNumber;',
    "    orders[idx].trackingCarrier = carrier || 'Other';",
    '    orders[idx].trackingUploadedAt = new Date().toISOString();',
    '    saveOrders(orders);',
    '  }',
    '  return result;',
    '}',
    ''
  ].join('\n');
  s = s.substring(0, insertAt) + trackCode + s.substring(insertAt);
  console.log('✅ Tracking system installed');
  applied++;
} else { skipped++; }

if (!s.includes("'/api/upload-tracking'")) {
  s = s.replace(
    "app.get('/health'",
    "app.post('/api/upload-tracking', async function(req,res){\n  var b=req.body;\n  res.json(await uploadTrackingManual(b.orderId,b.trackingNumber,b.carrier));\n});\n\napp.get('/health'"
  );
  console.log('✅ Tracking API installed');
  applied++;
} else { skipped++; }

// ============================================================
// INDEX.HTML
// ============================================================

patch('Fix orders fetch',
  "fetch('/api/orders').then(function(r){return r.json();}).then(function(orders){",
  "fetch('http://localhost:3000/api/orders').then(function(r){return r.json();}).then(function(data){\n    var orders=Array.isArray(data)?data:(data.orders||[]);", 'html'
);

patch('Default All Time',
  "var profitPeriod='month';",
  "var profitPeriod='all';", 'html'
);

patch('verifiedPrice row',
  "var r=o.ebayPrice||0,c=o.amazonCost||0,f2=r*(FVF+PR+PY)+0.30,p=r-c-f2;",
  "var r=o.ebayPrice||0,c=o.amazonCost||o.verifiedPrice||0,f2=r*(FVF+PR+PY)+0.30,p=r-c-f2;", 'html'
);

patch('verifiedPrice summary',
  "ok.forEach(function(o){var r=o.ebayPrice||0,c=o.amazonCost||0;rev+=r;",
  "ok.forEach(function(o){var r=o.ebayPrice||0,c=o.amazonCost||o.verifiedPrice||0;rev+=r;", 'html'
);

patch('Fix isCancelled',
  "getTrackingCell(o,isCancelled,r)",
  "getTrackingCell(o,st==='Cancelled',r)", 'html'
);



// Fix tracking button onclick
if (h.includes('this.dataset.oid')) {
  h = h.replace(
    "return '<button data-oid=\"'+(o.orderId||'')+\"'\" + ' onclick=\"uploadTracking(this.dataset.oid)\"",
    "return '<button onclick=\"uploadTracking(\\''+(o.orderId||'')+'\\')\"'"
  );
  // simpler approach - just replace the whole getTrackingCell function
  var gcStart = h.indexOf('function getTrackingCell(');
  var gcEnd = h.indexOf('\nfunction ', gcStart + 1);
  if (gcStart > -1 && gcEnd > -1) {
    var newFn = [
      'function getTrackingCell(o,cancelled,rev) {',
      "  if (o.trackingNumber) return '<span style=\"color:var(--green);font-size:10px\">\u2705 ' + o.trackingNumber.substring(0,12) + '</span>';",
      "  if (!cancelled && rev > 0) return '<button onclick=\"uploadTracking(\\'' + (o.orderId||'') + '\\')\" style=\"padding:2px 8px;border-radius:4px;border:1px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;font-size:10px\">+ Tracking</button>';",
      "  return '-';",
      '}'
    ].join('\n');
    h = h.substring(0, gcStart) + newFn + h.substring(gcEnd);
    console.log('✅ Tracking button fixed');
    applied++;
  }
} else { skipped++; }



// Add orderId debug to uploadTracking
(function() {
  var debugFind = 'function uploadTracking(orderId) {';
  var debugReplace = 'function uploadTracking(orderId) {\n  if (!orderId) { alert("Error: orderId is empty!"); return; }';
  if (h.includes(debugFind) && !h.includes('orderId is empty')) {
    h = h.replace(debugFind, debugReplace);
    console.log('✅ uploadTracking debug added');
    applied++;
  } else { skipped++; }
})();

// ============================================================
// SAVE
// ============================================================
fs.writeFileSync('server.js', s);
fs.writeFileSync('index.html', h);

console.log('\n============================================================');
console.log('PATCH SUMMARY: Applied ' + applied + ' | Skipped ' + skipped);
console.log('============================================================');

var checks = {
  'loadOrders OK': (s.indexOf('\nfunction ', s.indexOf('function loadOrders()')+1) - s.indexOf('function loadOrders()')) < 200,
  'NOCO blocked': s.includes("'noco '"),
  'Trademark check': s.includes('Trademark symbol'),
  'Tracking system': s.includes('uploadTrackingManual'),
  'Tracking API': s.includes('upload-tracking'),
  'Dashboard fetch': h.includes('data.orders||[]'),
  'verifiedPrice': h.includes('o.verifiedPrice'),
  'Tracking button': !h.includes('this.dataset.oid'),
};

Object.entries(checks).forEach(function(e) { console.log((e[1]?'✅':'❌') + ' ' + e[0]); });
var pass = Object.values(checks).every(Boolean);
console.log(pass ? '\n✅ All good! Restart DropPilot.' : '\n⚠️  Run patch.js again.');
