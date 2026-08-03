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
// SERVER.JS - VeRO Brands
// ============================================================
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
addVeRO('Dymo label makers', "'brady ','brady m'", "'dymo ','dymo label','labelwriter ','brady ','brady m'");
addVeRO('EGO, DJI, Garrett, RODE', "'brady ','brady m'", "'ego power','dji ','garrett ','rode ','røde ','mossy oak','akg ','battery tender','intex ','mackie ','tascam ','brady ','brady m'");
addVeRO('Crock-Pot, Ninja, AKG', "'brady ','brady m'", "'crock-pot','crockpot','ninja® ','swingline ','acco ','quartet ','brady ','brady m'");
addVeRO('Ringside, Meister boxing', "'everlast '", "'ringside ','meister ','title boxing','hayabusa ','venum ','rival boxing','everlast '");
addVeRO('Gorilla Grip, Sherpa', "'petmate '", "'gorilla grip','sherpa pet','sherpa original','petmate '");
addVeRO('FlexiSpot, HealthyLine', "'tivoli '", "'flexispot ','uplift desk','autonomous desk','healthyline','biomat ','tivoli '");

// Block electric scooters and baby safety
(function() {
  var blocks = ['electric scooter','e-scooter','electric bike','ebike','e-bike','electric skateboard',
    'nursing pillow','boppy ','breastfeeding pillow','baby lounger','infant lounger',
    'financial calculator','graphing calculator'];
  blocks.forEach(function(kw) {
    if (!s.includes("'" + kw + "'") || !s.includes(kw + ",'smoke detector'")) {
      s = s.replace("var safetyDevices = ['smoke detector'", "var safetyDevices = ['" + kw + "','smoke detector'");
      console.log('\u2705 Blocked: ' + kw);
      applied++;
    } else { skipped++; }
  });
})();
addVeRO('Ringside, Meister, Everlast boxing', "'everlast '", "'ringside ','meister ','title boxing','hayabusa ','venum ','rival boxing','everlast '");
addVeRO('Gorilla Grip, Sherpa brands', "'petmate '", "'gorilla grip','sherpa pet','sherpa original','sherpa bag','petmate '");
addVeRO('FlexiSpot standing desks', "'tivoli '", "'flexispot ','uplift desk','autonomous desk','varidesk ','tivoli '");
addVeRO('HealthyLine, BioMat, UTK therapy mats', "'utk '", "'healthyline','biomat ','richway ','utk ','utk far'");

// Fix broken loadOrders
var lo_start = s.indexOf('function loadOrders()');
var lo_end = s.indexOf('\nfunction ', lo_start + 1);
if (lo_end - lo_start > 200) {
  var fixed = "function loadOrders() {\n  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); }\n  catch(e) { return []; }\n}\n";
  s = s.substring(0, lo_start) + fixed + s.substring(lo_end);
  console.log('✅ Fixed broken loadOrders');
  applied++;
} else { skipped++; }

// Block persistent failing ASINs
(function() {
  var badAsins = ['B0C7BYQBP8','B0DP2L9CFR'];
  badAsins.forEach(function(asin) {
    if (!s.includes("'" + asin + "'")) {
      var skipList = s.match(/'B0[A-Z0-9]{8}','B0[A-Z0-9]{8}'/);
      if (skipList) {
        s = s.replace(skipList[0], "'" + asin + "'," + skipList[0]);
        console.log('✅ Blocked ASIN: ' + asin);
        applied++;
      }
    } else { skipped++; }
  });
})();

patch('Block compatible VeRO brand products',
  "  // 3b. Ambiguous size/variant titles",
  "  // 3b. Block compatible products for VeRO brands\n  var compatibleVeRO = ['for oral b','for oral-b','for braun','for philips','for waterpik','for theragun','for dyson','for roomba','for irobot','for nespresso','for keurig','for vitamix','for kitchenaid','for ninja','for instant pot','for cricut'];\n  if (compatibleVeRO.some(function(k){return t.includes(k);})) return { pass: false, reason: 'Compatible product for VeRO brand' };\n\n  // 3b. Ambiguous size/variant titles"
);

patch('Auto-relist after sale',
  "    // Mark as proven seller\n    markProvenSeller(order.asin, order.title, currentPrice, order.ebayPrice);",
  "    // Mark as proven seller\n    markProvenSeller(order.asin, order.title, currentPrice, order.ebayPrice);\n    // Auto-relist after sale\n    setTimeout(async function() {\n      try {\n        var listings = loadListings();\n        if (!listings[order.asin]) {\n          var markup = getMarkup(currentPrice);\n          var newEbayPrice = calculateEbayPrice(currentPrice, markup);\n          var rp = { asin: order.asin, title: order.title, price: currentPrice, ebayPrice: newEbayPrice, brand: '', features: [], color: '', image: 'https://m.media-amazon.com/images/P/' + order.asin + '.01._AC_SL1500_.jpg' };\n          var r = await createEbayListing(rp);\n          if (r.success) { listedAsins.add(order.asin); console.log('[AutoRelist] Relisted: ' + order.title.substring(0,40)); }\n        }\n      } catch(e) { console.log('[AutoRelist] Error: ' + e.message); }\n    }, 30000);"
);

// Add compatibleVeRO block directly
(function() {
  if (s.includes('compatibleVeRO')) { skipped++; return; }
  var anchor = "if (/\\d+\/\\d+\/\\d+/.test(title))";
  if (!s.includes(anchor)) { anchor = "var restrict = isRestricted(title)"; }
  if (s.includes(anchor)) {
    s = s.replace(anchor, "var compatibleVeRO=['for oral b','for oral-b','for braun','for philips','for dyson','for roomba','for nespresso','for keurig','for vitamix','for kitchenaid','for ninja','for instant pot','for cricut','for waterpik'];" +
      "if(compatibleVeRO.some(function(k){return t.includes(k);}))return{pass:false,reason:'Compatible VeRO brand product'};" +
      anchor);
    console.log('✅ Compatible VeRO products blocked');
    applied++;
  } else { console.log('⚠️  Could not add compatible VeRO block'); }
})();

// Add auto-relist after sale
(function() {
  if (s.includes('AutoRelist')) { skipped++; return; }
  var relistCode = '\n    // Auto-relist after sale\n    setTimeout(async function(){try{var lsts=loadListings();if(!lsts[order.asin]){var mk=getMarkup(currentPrice);var ep=calculateEbayPrice(currentPrice,mk);var rp={asin:order.asin,title:order.title,price:currentPrice,ebayPrice:ep,brand:\'\',features:[],color:\'\',image:\'https://m.media-amazon.com/images/P/\'+order.asin+\'.01._AC_SL1500_.jpg\'};var r=await createEbayListing(rp);if(r.success){listedAsins.add(order.asin);console.log(\'[AutoRelist] Relisted: \'+order.title.substring(0,40));}}}catch(e){console.log(\'[AutoRelist] Error: \'+e.message);}},30000);';
  var anchor = 'markProvenSeller(order.asin, order.title, currentPrice, order.ebayPrice);';
  if (s.includes(anchor)) {
    s = s.replace(anchor, anchor + relistCode);
    console.log('\u2705 Auto-relist after sale added');
    applied++;
  } else { console.log('\u26a0\ufe0f  Could not add auto-relist'); }
})();

patch('Fix quantity from 2 to 1',
  '<Quantity>2</Quantity>',
  '<Quantity>1</Quantity>'
);

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
  var insertAt = s.indexOf("app.get('/health'");
  var lines = [
    '',
    'async function uploadTrackingToEbay(orderId, trackingNumber, carrier) {',
    '  try {',
    '    var accessToken = await getEbayAccessToken();',
    "    var carrierCode = carrier || 'Other';",
    "    var tn = (trackingNumber || '').toUpperCase();",
    "    if (tn.startsWith('1Z')) carrierCode = 'UPS';",
    "    else if (tn.match(/^(94|92|93|TBA)/)) carrierCode = 'USPS';",
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
    "    if (res.ok || res.status === 201) { console.log('[Tracking] Uploaded: '+trackingNumber); return {success:true}; }",
    '    return {success:false, error: await res.text()};',
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
  ];
  s = s.substring(0, insertAt) + lines.join('\n') + s.substring(insertAt);
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
// INDEX.HTML patches
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

// Fix getTrackingCell with event delegation
if (h.includes('this.dataset.oid') || h.includes('data-oid=')) {
  var gcS = h.indexOf('function getTrackingCell(');
  var gcE = h.indexOf('\nfunction ', gcS + 1);
  if (gcS > -1 && gcE > -1) {
    var newFn = 'function getTrackingCell(o,cancelled,rev) {\n';
    newFn += "  if (o.trackingNumber) return '<span style=\"color:var(--green);font-size:10px\">\u2705 ' + o.trackingNumber.substring(0,12) + '</span>';\n";
    newFn += "  if (!cancelled && rev > 0) return '<button class=\"trk-btn\" data-oid=\"' + (o.orderId||\"\") + '\" style=\"padding:2px 8px;border-radius:4px;border:1px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;font-size:10px\">+ Tracking</button>';\n";
    newFn += "  return '-';\n}";
    h = h.substring(0, gcS) + newFn + h.substring(gcE);
    console.log('✅ getTrackingCell fixed');
    applied++;
  }
} else { skipped++; }

// Add event delegation if not present
if (!h.includes('trk-btn') || !h.includes('addEventListener')) {
  h = h.replace(
    'function loadProfitDashboard(){',
    'document.addEventListener("click",function(e){if(e.target&&e.target.classList.contains("trk-btn")){uploadTracking(e.target.getAttribute("data-oid"));}});\nfunction loadProfitDashboard(){'
  );
  console.log('✅ Event delegation added');
  applied++;
} else { skipped++; }

// Remove overly aggressive Prime filter at scan time
(function() {
  if (!s.includes('sIsPrime')) { skipped++; return; }
  s = s.split('var sIsPrime = i.is_prime === true').join('var sIsPrime_disabled = i.is_prime === true');
  s = s.split('if (!sIsPrime) { continue; }').join('// Prime filter disabled');
  s = s.split('var iIsPrime = i.is_prime === true').join('var iIsPrime_disabled = i.is_prime === true');
  s = s.split('if (!iIsPrime) { continue; }').join('// Prime filter disabled');
  console.log('\u2705 Prime filter disabled at scan time');
  applied++;
})();

// Add missing functions that loop depends on
(function() {
  if (s.includes('function relistProvenSellers')) { skipped++; return; }
  var stub = 'async function relistProvenSellers(){return;}\nasync function checkAndUploadTracking(){return;}\n';
  s = s.replace('while (pipelineRunning) {', stub + 'while (pipelineRunning) {');
  console.log('\u2705 Missing loop functions added');
  applied++;
})();

// Fix missing await before Promise.all in loop
(function() {
  if (s.includes('await Promise.all(items.map')) { skipped++; return; }
  s = s.replace('Promise.all(items.map(function(item) {', 'await Promise.all(items.map(function(item) {');
  console.log('\u2705 Fixed missing await in loop');
  applied++;
})();

// Disable overly aggressive brand risk scorer
(function() {
  if (!s.includes('isSuspectBrand')) { skipped++; return; }
  s = s.split('var suspectBrand = isSuspectBrand(item.title, itemBrand);').join('var suspectBrand = false; // disabled');
  s = s.split('if (suspectBrand) {').join('if (false) { // brand risk disabled');
  console.log('\u2705 Brand risk scorer disabled');
  applied++;
})();

// Remove scan ticker
(function() {
  if (!h.includes('scan-ticker">Idle')) { skipped++; return; }
  h = h.replace('\n    <div class="scan-ticker" id="scan-ticker">Idle</div>', '');
  console.log('\u2705 Scan ticker removed');
  applied++;
})();

// Block persistent failing photography ASINs
(function() {
  var badAsins = ['B017D7W57S','B07ZJFXPNW','B07314B82V','B09MNFKB2Z','B0BNKJ3L14',
    'B07GTBWHJH','B0F9WSF4QC','B0D8PLVYH1','B0D14MXLWN','B07PMSBLTH','B08TMBXLGD','B087CZ85GV'];
  badAsins.forEach(function(asin) {
    if (!s.includes("'" + asin + "'")) {
      s = s.replace("'B0FPQ94QRS'", "'" + asin + "','B0FPQ94QRS'");
      console.log('\u2705 Blocked ASIN: ' + asin);
      applied++;
    } else { skipped++; }
  });
})();

// Fix tracking button with event delegation
(function() {
  if (h.includes("addEventListener('click'") && h.includes('trk-btn')) { skipped++; return; }
  var gcS = h.indexOf('function getTrackingCell(');
  var gcE = h.indexOf('\nfunction ', gcS + 1);
  if (gcS > -1 && gcE > -1) {
    var newFn = "function getTrackingCell(o,cancelled,rev) {\n";
    newFn += "  if (o.trackingNumber) return '<span style=\"color:var(--green);font-size:10px\">✅ ' + o.trackingNumber.substring(0,12) + '</span>';\n";
    newFn += "  if (!cancelled && rev > 0) return '<button class=\"trk-btn\" data-oid=\"'+(o.orderId||'')+'\" style=\"padding:2px 8px;border-radius:4px;border:1px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;font-size:10px\">+ Tracking</button>';\n";
    newFn += "  return '-';\n}";
    h = h.substring(0, gcS) + newFn + h.substring(gcE);
    console.log('\u2705 getTrackingCell fixed with trk-btn class');
    applied++;
  }
  if (!h.includes("addEventListener('click'")) {
    h = h.replace('function loadProfitDashboard(){',
      "document.addEventListener('click',function(e){if(e.target&&e.target.classList&&e.target.classList.contains('trk-btn')){var oid=e.target.getAttribute('data-oid');uploadTracking(oid);}});\nfunction loadProfitDashboard(){");
    console.log('\u2705 Event delegation added');
    applied++;
  }
})();

// Fix categories for common products
patch('Fix surge protector category',
  "if (t.includes('heating pad')",
  "if (t.includes('surge protector')||t.includes('power strip')||t.includes('extension cord')) return {id:'42440',name:'Surge Protectors',type:'Surge Protector',outerMaterial:'Plastic',style:'Modern',size:'One Size',connectivity:'Wired',mattressSize:'Not Applicable',frameMaterial:'Not Applicable'};\n  if (t.includes('standing desk')||t.includes('desk converter')||t.includes('desk riser')) return {id:'131090',name:'Standing Desks',type:'Standing Desk',outerMaterial:'Wood',style:'Modern',size:'See Description',connectivity:'Not Applicable',mattressSize:'Not Applicable',frameMaterial:'Metal'};\n  if (t.includes('keyboard tray')||t.includes('keyboard drawer')) return {id:'58058',name:'Keyboard Trays',type:'Keyboard Tray',outerMaterial:'Metal',style:'Modern',size:'See Description',connectivity:'Not Applicable',mattressSize:'Not Applicable',frameMaterial:'Metal'};\n  if (t.includes('heating pad')"
);

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
  'Ringside blocked': s.includes("'ringside '"),
  'Gorilla Grip blocked': s.includes("'gorilla grip'"),
  'Trademark check': s.includes('Trademark symbol'),
  'Tracking system': s.includes('uploadTrackingManual'),
  'Tracking API': s.includes("'/api/upload-tracking'"),
  'Dashboard fetch': h.includes('data.orders||[]'),
  'verifiedPrice': h.includes('o.verifiedPrice'),
  'Tracking button': h.includes('trk-btn'),
  'Event delegation': h.includes('addEventListener'),
};

Object.entries(checks).forEach(function(e) { console.log((e[1]?'✅':'❌') + ' ' + e[0]); });
var pass = Object.values(checks).every(Boolean);
console.log(pass ? '\n✅ All good! Restart DropPilot.' : '\n⚠️  Run patch.js again.');
