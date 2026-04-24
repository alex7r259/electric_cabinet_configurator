const PLACEHOLDER_PANEL = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f0f1f3"/><stop offset="100%" stop-color="#d9dde3"/>
    </linearGradient>
    <linearGradient id="rail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#a8b2bf"/><stop offset="50%" stop-color="#d6dde6"/><stop offset="100%" stop-color="#9ea9b7"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="#ececef"/>
  <rect x="20" y="20" width="860" height="860" rx="12" fill="url(#bg)" stroke="#c9ced6" stroke-width="6"/>
  <rect x="80" y="210" width="740" height="26" rx="6" fill="url(#rail)"/>
  <rect x="80" y="420" width="740" height="26" rx="6" fill="url(#rail)"/>
  <rect x="80" y="630" width="740" height="26" rx="6" fill="url(#rail)"/>
  <rect x="150" y="800" width="240" height="24" rx="8" fill="#0f5b9b"/>
  <rect x="510" y="800" width="240" height="24" rx="8" fill="#1f8d3d"/>
</svg>`);
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380"><rect width="100%" height="100%" fill="#dbe3ef"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="28" fill="#64748b">Нет фото компонента</text></svg>');

const defaultEnclosures = [
  { id: 'enc-12', name: 'Навесной, 12 модулей', modules: 12, price: 2800, image: PLACEHOLDER_PANEL },
  { id: 'enc-24', name: 'Навесной, 24 модуля', modules: 24, price: 4350, image: PLACEHOLDER_PANEL },
  { id: 'enc-36', name: 'Встраиваемый, 36 модулей', modules: 36, price: 6500, image: PLACEHOLDER_PANEL },
];

const defaultComponents = [
  { id: 'br-abb-c16', name: 'Автомат ABB S201 C16', category: 'Автомат', brand: 'abb', textureType: 'mcb', modules: 1, price: 620, image: PLACEHOLDER, overviewImage: PLACEHOLDER },
  { id: 'uzo-abb-40', name: 'УЗО ABB F202 AC 40A 30mA', category: 'УЗО', brand: 'abb', textureType: 'rcd', modules: 2, price: 3200, image: PLACEHOLDER, overviewImage: PLACEHOLDER },
  { id: 'relay-zubr-d40', name: 'Реле напряжения ZUBR D40', category: 'Реле', brand: 'generic', textureType: 'mcb', modules: 2, price: 4250, image: PLACEHOLDER, overviewImage: PLACEHOLDER },
];

const state = {
  enclosures: loadStore('ec_enclosures', defaultEnclosures),
  components: loadStore('ec_components', defaultComponents),
  orders: loadStore('ec_orders', []),
  enclosureId: null,
  phases: 1,
  loadKw: 15,
  entryBreaker: null,
  placements: [],
  filterSearch: '',
  filterCategory: '',
  selectedOverviewImage: PLACEHOLDER,
};

const MODULES_PER_ROW = 12;

const el = {
  userApp: document.querySelector('#user-app'),
  adminApp: document.querySelector('#admin-app'),
  toggleAdmin: document.querySelector('#toggle-admin'),
  enclosureSelect: document.querySelector('#enclosure-select'),
  phaseSelect: document.querySelector('#phase-select'),
  loadInput: document.querySelector('#load-input'),
  entryBreakerHint: document.querySelector('#entry-breaker-hint'),
  componentList: document.querySelector('#component-list'),
  filterSearch: document.querySelector('#filter-search'),
  filterCategory: document.querySelector('#filter-category'),
  overviewImage: document.querySelector('#overview-image'),
  cabinet: document.querySelector('#cabinet'),
  enclosurePhoto: document.querySelector('#enclosure-photo'),
  moduleStatus: document.querySelector('#module-status'),
  summaryLines: document.querySelector('#summary-lines'),
  componentsTotal: document.querySelector('#components-total'),
  enclosureTotal: document.querySelector('#enclosure-total'),
  assemblyTotal: document.querySelector('#assembly-total'),
  grandTotal: document.querySelector('#grand-total'),
  setEntryBreaker: document.querySelector('#set-entry-breaker'),
  helperMode: document.querySelector('#helper-mode'),
  orderBtn: document.querySelector('#order-btn'),
  orderDialog: document.querySelector('#order-dialog'),
  closeDialog: document.querySelector('#close-dialog'),
  orderForm: document.querySelector('#order-form'),
  enclosureForm: document.querySelector('#enclosure-form'),
  componentForm: document.querySelector('#component-form'),
  enclosureAdminList: document.querySelector('#enclosure-admin-list'),
  componentAdminList: document.querySelector('#component-admin-list'),
  ordersAdminList: document.querySelector('#orders-admin-list'),
};

function loadStore(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return structuredClone(fallback);
  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(fallback);
  }
}

function saveStore() {
  localStorage.setItem('ec_enclosures', JSON.stringify(state.enclosures));
  localStorage.setItem('ec_components', JSON.stringify(state.components));
  localStorage.setItem('ec_orders', JSON.stringify(state.orders));
}

function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

function formatMoney(v) {
  return `${new Intl.NumberFormat('ru-RU').format(v)} ₽`;
}

function getCurrentEnclosure() {
  return state.enclosures.find((e) => e.id === state.enclosureId) || state.enclosures[0];
}

function ensurePlacementSize() {
  const modules = getCurrentEnclosure().modules;
  state.placements = Array.from({ length: modules }, (_, i) => state.placements[i] || null);
}

function rowStart(index) { return Math.floor(index / MODULES_PER_ROW) * MODULES_PER_ROW; }

function canPlace(item, startIndex, ignoreKey = null) {
  const total = getCurrentEnclosure().modules;
  if (startIndex < 0 || startIndex + item.modules > total) return false;
  if (rowStart(startIndex) !== rowStart(startIndex + item.modules - 1)) return false;
  for (let i = 0; i < item.modules; i += 1) {
    const cell = state.placements[startIndex + i];
    if (!cell) continue;
    if (ignoreKey && cell.instanceKey === ignoreKey) continue;
    return false;
  }
  return true;
}

function putItem(item, startIndex, instanceKey = uid('cmp')) {
  for (let i = 0; i < item.modules; i += 1) {
    state.placements[startIndex + i] = { ...item, anchor: i === 0, startIndex, instanceKey };
  }
}

function clearItem(instanceKey) {
  state.placements = state.placements.map((cell) => (cell?.instanceKey === instanceKey ? null : cell));
}

function estimateEntryBreaker(loadKw, phases) {
  const voltage = phases === 3 ? 380 : 220;
  const current = Math.ceil((loadKw * 1000) / (voltage * (phases === 3 ? 1.73 : 1)));
  const nominal = [16, 20, 25, 32, 40, 50, 63, 80, 100].find((n) => current <= n) || 100;
  const poles = phases === 3 ? 3 : 2;
  return { id: uid('entry'), name: `Вводной автомат ${poles}P C${nominal}`, modules: poles, price: 900 + nominal * 8 + poles * 120 };
}

function visibleComponents() {
  return state.components.filter((c) => {
    const q = state.filterSearch.toLowerCase();
    const searchOk = !q || c.name.toLowerCase().includes(q);
    const catOk = !state.filterCategory || c.category === state.filterCategory;
    return searchOk && catOk;
  });
}

function renderFilters() {
  const categories = [...new Set(state.components.map((x) => x.category).filter(Boolean))];
  el.filterCategory.innerHTML = '<option value="">Все категории</option>';
  categories.forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    if (cat === state.filterCategory) option.selected = true;
    el.filterCategory.append(option);
  });
}

function renderEnclosureSelect() {
  if (!state.enclosures.length) return;
  if (!state.enclosureId || !state.enclosures.some((e) => e.id === state.enclosureId)) state.enclosureId = state.enclosures[0].id;
  el.enclosureSelect.innerHTML = '';
  state.enclosures.forEach((e) => {
    const option = document.createElement('option');
    option.value = e.id;
    option.textContent = `${e.name} · ${formatMoney(e.price)}`;
    if (e.id === state.enclosureId) option.selected = true;
    el.enclosureSelect.append(option);
  });
}

function renderCatalog() {
  const template = document.querySelector('#component-card-template');
  el.componentList.innerHTML = '';
  visibleComponents().forEach((item) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector('.thumb').src = item.image || PLACEHOLDER;
    node.querySelector('.title').textContent = item.name;
    node.querySelector('.meta').textContent = `${item.category} · ${item.modules} мод.`;
    node.querySelector('.price').textContent = formatMoney(item.price);

    node.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'catalog', itemId: item.id }));
    });
    node.addEventListener('click', () => {
      state.selectedOverviewImage = item.overviewImage || item.image || PLACEHOLDER;
      const idx = state.placements.findIndex((x) => !x);
      if (idx >= 0 && canPlace(item, idx)) {
        putItem(item, idx);
        renderUser();
      } else {
        renderUser();
      }
    });
    el.componentList.append(node);
  });
}

function onSlotDrop(event, slotIndex) {
  event.preventDefault();
  event.currentTarget.classList.remove('drop-hover');
  let payload;
  try { payload = JSON.parse(event.dataTransfer.getData('text/plain')); } catch { return; }

  if (payload.type === 'catalog') {
    const item = state.components.find((x) => x.id === payload.itemId);
    if (item && canPlace(item, slotIndex)) {
      putItem(item, slotIndex);
      state.selectedOverviewImage = item.overviewImage || item.image || PLACEHOLDER;
    }
  }

  if (payload.type === 'placed') {
    const oldCell = state.placements[payload.fromIndex];
    if (!oldCell) return;
    const moved = { ...oldCell };
    clearItem(oldCell.instanceKey);
    if (canPlace(moved, slotIndex, oldCell.instanceKey)) putItem(moved, slotIndex, oldCell.instanceKey);
    else putItem(moved, oldCell.startIndex, oldCell.instanceKey);
  }
  renderUser();
}

function createModuleElement(cell, idx, slotGap) {
  const device = document.createElement('div');
  const rawBrand = (cell.brand || '').toString().toLowerCase();
  const brand = rawBrand.includes('abb') ? 'abb' : rawBrand.includes('sch') ? 'schneider' : 'generic';
  const textureType = cell.textureType || 'mcb';
  const shortLabel = cell.name.length > 16 ? `${cell.name.slice(0, 16)}…` : cell.name;
  device.className = `device module ${brand} ${textureType}`;
  device.style.width = `calc(${cell.modules * 100}% + ${(cell.modules - 1) * slotGap}px)`;
  device.draggable = true;
  device.innerHTML = `
    <div class="module-body"></div>
    <div class="module-label">${shortLabel}</div>
    <div class="module-shadow"></div>
    <button type="button" title="Удалить">×</button>
  `;
  device.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'placed', fromIndex: idx })));
  device.querySelector('button').addEventListener('click', () => {
    clearItem(cell.instanceKey);
    renderUser();
  });
  return device;
}

function renderCabinet() {
  el.cabinet.innerHTML = '';
  const total = getCurrentEnclosure().modules;
  const rows = Math.ceil(total / MODULES_PER_ROW);
  const slotGap = 4;
  for (let row = 0; row < rows; row += 1) {
    const rail = document.createElement('div');
    rail.className = 'rail-track';
    const colsInRow = Math.min(MODULES_PER_ROW, total - row * MODULES_PER_ROW);
    rail.style.gridTemplateColumns = `repeat(${colsInRow}, minmax(0,1fr))`;

    const rowSlots = [];
    for (let col = 0; col < MODULES_PER_ROW; col += 1) {
      const idx = row * MODULES_PER_ROW + col;
      if (idx >= total) break;
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.index = String(idx);
      slot.addEventListener('dragover', (e) => e.preventDefault());
      slot.addEventListener('dragenter', () => slot.classList.add('drop-hover'));
      slot.addEventListener('dragleave', () => slot.classList.remove('drop-hover'));
      slot.addEventListener('drop', (e) => onSlotDrop(e, idx));
      rowSlots.push(slot);
      rail.append(slot);
    }

    rowSlots.forEach((slot) => {
      const idx = Number(slot.dataset.index);
      const cell = state.placements[idx];
      if (!cell?.anchor) return;
      const device = createModuleElement(cell, idx, slotGap);
      slot.append(device);
    });

    el.cabinet.append(rail);
  }

  const used = (state.entryBreaker?.modules || 0) + state.placements.filter(Boolean).length;
  if (used > total) {
    el.cabinet.querySelectorAll('.rail-track').forEach((rail) => rail.classList.add('overflow'));
  }
}

function renderSummary() {
  el.summaryLines.innerHTML = '';
  if (state.entryBreaker) {
    const line = document.createElement('div');
    line.className = 'summary-item';
    line.innerHTML = `<span>${state.entryBreaker.name}</span><span>1 шт.</span><strong>${formatMoney(state.entryBreaker.price)}</strong>`;
    el.summaryLines.append(line);
  }
  state.placements.forEach((cell) => {
    if (!cell?.anchor) return;
    const line = document.createElement('div');
    line.className = 'summary-item';
    line.innerHTML = `<span>${cell.name}</span><span>1 шт.</span><strong>${formatMoney(cell.price)}</strong>`;
    el.summaryLines.append(line);
  });
}

function renderTotals() {
  const componentsTotal = (state.entryBreaker?.price || 0) + state.placements.filter((x) => x?.anchor).reduce((sum, x) => sum + x.price, 0);
  const enclosureTotal = getCurrentEnclosure().price || 0;
  const assemblyTotal = 2500 + state.placements.filter((x) => x?.anchor).length * 140 + (state.phases === 3 ? 850 : 0);
  const grand = componentsTotal + enclosureTotal + assemblyTotal;

  el.componentsTotal.textContent = formatMoney(componentsTotal);
  el.enclosureTotal.textContent = formatMoney(enclosureTotal);
  el.assemblyTotal.textContent = formatMoney(assemblyTotal);
  el.grandTotal.textContent = formatMoney(grand);

  const used = (state.entryBreaker?.modules || 0) + state.placements.filter(Boolean).length;
  const free = getCurrentEnclosure().modules - used;
  el.moduleStatus.textContent = `Занято ${used}/${getCurrentEnclosure().modules}, свободно ${free}`;
  el.orderBtn.disabled = !state.entryBreaker || free < 0;
}

function renderAdminLists() {
  el.enclosureAdminList.innerHTML = '';
  state.enclosures.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'admin-item';
    card.innerHTML = `<img src="${item.image || PLACEHOLDER}" alt=""><div><strong>${item.name}</strong><div>${item.modules} мод. · ${formatMoney(item.price)}</div></div><div class="actions"><button class="btn secondary" data-edit>Ред.</button><button class="btn secondary" data-del>Удал.</button></div>`;
    card.querySelector('[data-edit]').addEventListener('click', () => fillEnclosureForm(item));
    card.querySelector('[data-del]').addEventListener('click', () => {
      state.enclosures = state.enclosures.filter((x) => x.id !== item.id);
      saveStore();
      renderAll();
    });
    el.enclosureAdminList.append(card);
  });

  el.componentAdminList.innerHTML = '';
  state.components.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'admin-item';
    card.innerHTML = `<img src="${item.image || PLACEHOLDER}" alt=""><div><strong>${item.name}</strong><div>${item.category} · ${item.modules} мод. · ${formatMoney(item.price)}</div></div><div class="actions"><button class="btn secondary" data-edit>Ред.</button><button class="btn secondary" data-del>Удал.</button></div>`;
    card.querySelector('[data-edit]').addEventListener('click', () => fillComponentForm(item));
    card.querySelector('[data-del]').addEventListener('click', () => {
      state.components = state.components.filter((x) => x.id !== item.id);
      saveStore();
      renderAll();
    });
    el.componentAdminList.append(card);
  });

  el.ordersAdminList.innerHTML = '';
  if (!state.orders.length) {
    el.ordersAdminList.innerHTML = '<div class="panel-note">Заказов пока нет.</div>';
    return;
  }
  state.orders.forEach((order) => {
    const row = document.createElement('div');
    row.className = 'admin-item';
    row.style.gridTemplateColumns = '1fr auto';
    row.innerHTML = `<div><strong>${order.name}</strong> · ${order.phone}<div>${order.status} · ${formatMoney(order.total)} · ${new Date(order.createdAt).toLocaleString('ru-RU')}</div><div>${order.comment || ''}</div></div><div class="actions"><select><option>Новый</option><option>В работе</option><option>Собран</option><option>Выдан</option></select><button class="btn secondary">Сохранить</button></div>`;
    const select = row.querySelector('select');
    select.value = order.status;
    row.querySelector('button').addEventListener('click', () => {
      order.status = select.value;
      saveStore();
      renderAdminLists();
    });
    el.ordersAdminList.append(row);
  });
}

function fillEnclosureForm(item) {
  el.enclosureForm.dataset.editId = item.id;
  el.enclosureForm.name.value = item.name;
  el.enclosureForm.modules.value = item.modules;
  el.enclosureForm.price.value = item.price;
  el.enclosureForm.image.value = item.image || '';
}

function fillComponentForm(item) {
  el.componentForm.dataset.editId = item.id;
  el.componentForm.name.value = item.name;
  el.componentForm.category.value = item.category;
  el.componentForm.brand.value = item.brand || 'generic';
  el.componentForm.textureType.value = item.textureType || 'mcb';
  el.componentForm.modules.value = item.modules;
  el.componentForm.price.value = item.price;
  el.componentForm.image.value = item.image || '';
  el.componentForm.overviewImage.value = item.overviewImage || '';
}

async function fileToDataUrl(file) {
  if (!file) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

async function handleEnclosureSave(event) {
  event.preventDefault();
  const data = new FormData(el.enclosureForm);
  const imageFile = await fileToDataUrl(data.get('imageFile'));
  const item = {
    id: el.enclosureForm.dataset.editId || uid('enc'),
    name: String(data.get('name')),
    modules: Number(data.get('modules')),
    price: Number(data.get('price')),
    image: imageFile || String(data.get('image') || '') || PLACEHOLDER_PANEL,
  };

  if (el.enclosureForm.dataset.editId) state.enclosures = state.enclosures.map((x) => (x.id === item.id ? item : x));
  else state.enclosures.push(item);

  el.enclosureForm.reset();
  delete el.enclosureForm.dataset.editId;
  saveStore();
  renderAll();
}

async function handleComponentSave(event) {
  event.preventDefault();
  const data = new FormData(el.componentForm);
  const imageFile = await fileToDataUrl(data.get('imageFile'));
  const overviewFile = await fileToDataUrl(data.get('overviewFile'));
  const item = {
    id: el.componentForm.dataset.editId || uid('cmpcat'),
    name: String(data.get('name')),
    category: String(data.get('category')),
    brand: String(data.get('brand') || 'generic'),
    textureType: String(data.get('textureType') || 'mcb'),
    modules: Number(data.get('modules')),
    price: Number(data.get('price')),
    image: imageFile || String(data.get('image') || '') || PLACEHOLDER,
    overviewImage: overviewFile || String(data.get('overviewImage') || '') || PLACEHOLDER,
  };

  if (el.componentForm.dataset.editId) state.components = state.components.map((x) => (x.id === item.id ? item : x));
  else state.components.push(item);

  el.componentForm.reset();
  delete el.componentForm.dataset.editId;
  saveStore();
  renderAll();
}

function renderUser() {
  renderEnclosureSelect();
  ensurePlacementSize();
  renderFilters();
  renderCatalog();
  renderCabinet();
  renderSummary();
  renderTotals();

  const suggestion = estimateEntryBreaker(Number(state.loadKw), Number(state.phases));
  el.entryBreakerHint.textContent = `Рекомендуемый вводной автомат: ${suggestion.name}.`; 
  el.overviewImage.src = state.selectedOverviewImage || PLACEHOLDER;
  el.enclosurePhoto.src = getCurrentEnclosure().image || PLACEHOLDER_PANEL;
}

function renderAll() {
  renderUser();
  renderAdminLists();
}

el.toggleAdmin.addEventListener('click', () => {
  const isHidden = el.adminApp.classList.contains('hidden');
  el.adminApp.classList.toggle('hidden', !isHidden);
  el.userApp.classList.toggle('hidden', !isHidden);
  el.toggleAdmin.textContent = isHidden ? 'Вернуться в конфигуратор' : 'Админ-панель';
});

el.enclosureSelect.addEventListener('change', (e) => { state.enclosureId = e.target.value; renderUser(); });
el.phaseSelect.addEventListener('change', (e) => { state.phases = Number(e.target.value); renderUser(); });
el.loadInput.addEventListener('input', (e) => { state.loadKw = Number(e.target.value) || 1; renderUser(); });
el.filterSearch.addEventListener('input', (e) => { state.filterSearch = e.target.value; renderUser(); });
el.filterCategory.addEventListener('change', (e) => { state.filterCategory = e.target.value; renderUser(); });

el.setEntryBreaker.addEventListener('click', () => { state.entryBreaker = estimateEntryBreaker(state.loadKw, state.phases); renderUser(); });
el.helperMode.addEventListener('click', () => {
  state.entryBreaker = estimateEntryBreaker(state.loadKw, state.phases);
  state.placements = Array(getCurrentEnclosure().modules).fill(null);
  let cursor = 0;
  state.components.slice(0, 5).forEach((item) => {
    while (cursor < state.placements.length && !canPlace(item, cursor)) cursor += 1;
    if (cursor < state.placements.length) { putItem(item, cursor); cursor += item.modules; }
  });
  renderUser();
});

el.orderBtn.addEventListener('click', () => { if (!el.orderBtn.disabled) el.orderDialog.showModal(); });
el.closeDialog.addEventListener('click', () => el.orderDialog.close());

el.orderForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(el.orderForm);
  const total = Number(el.grandTotal.textContent.replace(/[^\d]/g, ''));
  state.orders.push({
    id: uid('ord'),
    name: String(data.get('name')),
    phone: String(data.get('phone')),
    comment: String(data.get('comment') || ''),
    status: 'Новый',
    total,
    createdAt: new Date().toISOString(),
  });
  saveStore();
  renderAdminLists();
  el.orderDialog.close();
  el.orderForm.reset();
  alert('Заявка отправлена. Менеджер свяжется с вами.');
});

el.enclosureForm.addEventListener('submit', handleEnclosureSave);
el.componentForm.addEventListener('submit', handleComponentSave);

if (state.enclosures.length) state.enclosureId = state.enclosures[0].id;
renderAll();
