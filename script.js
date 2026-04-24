const enclosures = [
  { id: 'enc-12', name: 'Навесной, 12 модулей', modules: 12, price: 2800 },
  { id: 'enc-24', name: 'Навесной, 24 модуля', modules: 24, price: 4350 },
  { id: 'enc-36', name: 'Встраиваемый, 36 модулей', modules: 36, price: 6500 },
];

const catalog = [
  { id: 'br-abb-c16', name: 'Автомат ABB S201 C16', category: 'Автомат', modules: 1, price: 620 },
  { id: 'br-sch-c16', name: 'Автомат Schneider Easy9 C16', category: 'Автомат', modules: 1, price: 560 },
  { id: 'uzo-abb-40', name: 'УЗО ABB F202 AC 40A 30mA', category: 'УЗО', modules: 2, price: 3200 },
  { id: 'uzo-sch-40', name: 'УЗО Schneider Easy9 40A 30mA', category: 'УЗО', modules: 2, price: 2950 },
  { id: 'relay-zubr-d40', name: 'Реле напряжения ZUBR D40', category: 'Реле', modules: 2, price: 4250 },
  { id: 'dif-abb-c16', name: 'Диффавтомат ABB DS201 C16 30mA', category: 'Прочее', modules: 2, price: 2950 },
  { id: 'spd-opc', name: 'ОПСC1-D 1P', category: 'Прочее', modules: 1, price: 1250 },
];

const state = {
  enclosureId: enclosures[1].id,
  phases: 1,
  loadKw: 15,
  entryBreaker: null,
  placements: [],
};

const enclosureSelect = document.querySelector('#enclosure-select');
const phaseSelect = document.querySelector('#phase-select');
const loadInput = document.querySelector('#load-input');
const entryBreakerHint = document.querySelector('#entry-breaker-hint');
const componentList = document.querySelector('#component-list');
const summaryLines = document.querySelector('#summary-lines');
const cabinet = document.querySelector('#cabinet');
const moduleStatus = document.querySelector('#module-status');

const componentsTotalEl = document.querySelector('#components-total');
const enclosureTotalEl = document.querySelector('#enclosure-total');
const assemblyTotalEl = document.querySelector('#assembly-total');
const grandTotalEl = document.querySelector('#grand-total');

const setEntryBreakerBtn = document.querySelector('#set-entry-breaker');
const helperModeBtn = document.querySelector('#helper-mode');
const orderBtn = document.querySelector('#order-btn');
const orderDialog = document.querySelector('#order-dialog');
const closeDialogBtn = document.querySelector('#close-dialog');
const orderForm = document.querySelector('#order-form');

const MODULES_PER_ROW = 12;

const formatMoney = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
const uid = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

function getCurrentEnclosure() {
  return enclosures.find((box) => box.id === state.enclosureId);
}

function getAllInstalled() {
  return state.placements.filter((x) => x);
}

function estimateEntryBreaker(loadKw, phases) {
  const voltage = phases === 3 ? 380 : 220;
  const current = Math.ceil((loadKw * 1000) / (voltage * (phases === 3 ? 1.73 : 1)));
  const nominal = [16, 20, 25, 32, 40, 50, 63, 80, 100].find((n) => current <= n) || 100;
  const poles = phases === 3 ? 3 : 2;
  const price = 950 + nominal * 8 + (poles === 3 ? 380 : 120);
  return {
    id: `entry-${phases}-${nominal}`,
    name: `Вводной автомат ${poles}P C${nominal}`,
    category: 'Вводной автомат',
    modules: poles,
    price,
    nominal,
    poles,
    current,
  };
}

function ensurePlacementSize() {
  const modules = getCurrentEnclosure().modules;
  const next = Array.from({ length: modules }, (_, i) => state.placements[i] || null);
  state.placements = next;
}

function rowStart(index) {
  return Math.floor(index / MODULES_PER_ROW) * MODULES_PER_ROW;
}

function canPlace(item, startIndex, ignoreKey = null) {
  const total = getCurrentEnclosure().modules;
  if (startIndex < 0 || startIndex + item.modules > total) return false;

  const startRow = rowStart(startIndex);
  const endRow = rowStart(startIndex + item.modules - 1);
  if (startRow !== endRow) return false;

  for (let i = 0; i < item.modules; i += 1) {
    const cell = state.placements[startIndex + i];
    if (!cell) continue;
    if (ignoreKey && cell.instanceKey === ignoreKey) continue;
    return false;
  }
  return true;
}

function putItem(item, startIndex, instanceKey = uid()) {
  for (let i = 0; i < item.modules; i += 1) {
    state.placements[startIndex + i] = {
      ...item,
      anchor: i === 0,
      startIndex,
      instanceKey,
    };
  }
}

function clearItem(instanceKey) {
  state.placements = state.placements.map((cell) => (cell?.instanceKey === instanceKey ? null : cell));
}

function getUsedModules() {
  const entryModules = state.entryBreaker?.modules || 0;
  return entryModules + getAllInstalled().length;
}

function getAssemblyCost() {
  const base = 2500;
  const installedCount = state.placements.filter((x) => x?.anchor).length;
  const perItem = installedCount * 140;
  const phasesFactor = state.phases === 3 ? 850 : 0;
  return base + perItem + phasesFactor;
}

function renderEnclosures() {
  enclosureSelect.innerHTML = '';
  enclosures.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.name} · ${formatMoney(item.price)}`;
    enclosureSelect.append(option);
  });
  enclosureSelect.value = state.enclosureId;
}

function renderCatalog() {
  componentList.innerHTML = '';
  const template = document.querySelector('#component-card-template');
  catalog.forEach((item) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector('.title').textContent = item.name;
    node.querySelector('.meta').textContent = `${item.category} · ${item.modules} мод.`;
    node.querySelector('.price').textContent = formatMoney(item.price);
    node.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'catalog', itemId: item.id }));
    });
    node.addEventListener('click', () => {
      const idx = state.placements.findIndex((slot) => !slot);
      if (idx >= 0 && canPlace(item, idx)) {
        putItem(item, idx);
        renderAll();
      }
    });
    componentList.append(node);
  });
}

function renderEntryBreakerHint() {
  const suggestion = estimateEntryBreaker(Number(state.loadKw), Number(state.phases));
  const enclosure = getCurrentEnclosure();
  const used = getUsedModules();
  entryBreakerHint.textContent = `Рекомендуемый вводной автомат: ${suggestion.name} (${suggestion.current}A расчетный ток).`
    + ` Корпус: ${enclosure.modules} модулей, занято: ${used}.`;
}

function onSlotDrop(event, slotIndex) {
  event.preventDefault();
  event.currentTarget.classList.remove('drop-hover');
  let payload;
  try {
    payload = JSON.parse(event.dataTransfer.getData('text/plain'));
  } catch {
    return;
  }
  if (!payload) return;

  if (payload.type === 'catalog') {
    const item = catalog.find((x) => x.id === payload.itemId);
    if (item && canPlace(item, slotIndex)) {
      putItem(item, slotIndex);
    }
  }

  if (payload.type === 'placed') {
    const oldCell = state.placements[payload.fromIndex];
    if (!oldCell) return;
    const movingItem = { ...oldCell };
    clearItem(oldCell.instanceKey);
    if (canPlace(movingItem, slotIndex, oldCell.instanceKey)) {
      putItem(movingItem, slotIndex, oldCell.instanceKey);
    } else {
      putItem(movingItem, oldCell.startIndex, oldCell.instanceKey);
    }
  }

  renderAll();
}

function renderCabinet() {
  cabinet.innerHTML = '';
  const total = getCurrentEnclosure().modules;
  const rows = Math.ceil(total / MODULES_PER_ROW);

  for (let row = 0; row < rows; row += 1) {
    const railRow = document.createElement('div');
    railRow.className = 'rail-row';
    const railTrack = document.createElement('div');
    railTrack.className = 'rail-track';
    railTrack.style.gridTemplateColumns = `repeat(${MODULES_PER_ROW}, minmax(0, 1fr))`;

    for (let col = 0; col < MODULES_PER_ROW; col += 1) {
      const idx = row * MODULES_PER_ROW + col;
      if (idx >= total) break;

      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.slot = String(idx);
      slot.addEventListener('dragover', (event) => event.preventDefault());
      slot.addEventListener('dragenter', () => slot.classList.add('drop-hover'));
      slot.addEventListener('dragleave', () => slot.classList.remove('drop-hover'));
      slot.addEventListener('drop', (event) => onSlotDrop(event, idx));

      const cell = state.placements[idx];
      if (cell?.anchor) {
        const device = document.createElement('div');
        device.className = 'device';
        device.draggable = true;
        device.style.gridColumn = `span ${cell.modules}`;
        device.innerHTML = `
          <div>${cell.name}</div>
          <div class="mini">${cell.modules} мод. · ${formatMoney(cell.price)}</div>
          <button class="remove" title="Удалить" type="button">×</button>
        `;
        device.addEventListener('dragstart', (event) => {
          event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'placed', fromIndex: idx }));
        });
        device.querySelector('.remove').addEventListener('click', () => {
          clearItem(cell.instanceKey);
          renderAll();
        });
        railTrack.append(device);
        col += cell.modules - 1;
      } else if (!cell) {
        railTrack.append(slot);
      }
    }

    railRow.append(railTrack);
    cabinet.append(railRow);
  }

  const freeModules = getCurrentEnclosure().modules - getUsedModules();
  moduleStatus.textContent = `Занято ${getUsedModules()} из ${getCurrentEnclosure().modules} · Свободно ${freeModules}`;
}

function renderSummary() {
  summaryLines.innerHTML = '';
  if (state.entryBreaker) {
    const line = document.createElement('div');
    line.className = 'summary-item';
    line.innerHTML = `<span>${state.entryBreaker.name}</span><span>1 шт.</span><strong>${formatMoney(state.entryBreaker.price)}</strong>`;
    summaryLines.append(line);
  }

  state.placements.forEach((cell) => {
    if (!cell?.anchor) return;
    const line = document.createElement('div');
    line.className = 'summary-item';
    line.innerHTML = `<span>${cell.name}</span><span>1 шт.</span><div><strong>${formatMoney(cell.price)}</strong> <button title="Удалить">×</button></div>`;
    line.querySelector('button').addEventListener('click', () => {
      clearItem(cell.instanceKey);
      renderAll();
    });
    summaryLines.append(line);
  });

  if (!state.entryBreaker && !state.placements.some(Boolean)) {
    summaryLines.innerHTML = '<p>Добавьте вводной автомат и перетащите компоненты в щит.</p>';
  }
}

function renderTotals() {
  const componentsTotal = (state.entryBreaker?.price || 0)
    + state.placements.filter((x) => x?.anchor).reduce((sum, item) => sum + item.price, 0);
  const enclosureTotal = getCurrentEnclosure().price;
  const assemblyTotal = getAssemblyCost();
  const grandTotal = componentsTotal + enclosureTotal + assemblyTotal;

  componentsTotalEl.textContent = formatMoney(componentsTotal);
  enclosureTotalEl.textContent = formatMoney(enclosureTotal);
  assemblyTotalEl.textContent = formatMoney(assemblyTotal);
  grandTotalEl.textContent = formatMoney(grandTotal);

  const freeModules = getCurrentEnclosure().modules - getUsedModules();
  orderBtn.disabled = !state.entryBreaker || freeModules < 0;
  if (freeModules < 0) {
    orderBtn.textContent = 'Превышено количество модулей';
    orderBtn.classList.remove('primary');
    orderBtn.classList.add('secondary');
  } else {
    orderBtn.textContent = 'Далее: проверка и заказ';
    orderBtn.classList.add('primary');
    orderBtn.classList.remove('secondary');
  }
}

function renderAll() {
  ensurePlacementSize();
  renderEntryBreakerHint();
  renderCabinet();
  renderSummary();
  renderTotals();
}

renderEnclosures();
renderCatalog();
renderAll();

enclosureSelect.addEventListener('change', (event) => {
  state.enclosureId = event.target.value;
  ensurePlacementSize();
  renderAll();
});

phaseSelect.addEventListener('change', (event) => {
  state.phases = Number(event.target.value);
  renderAll();
});

loadInput.addEventListener('input', (event) => {
  state.loadKw = Math.max(1, Number(event.target.value) || 1);
  renderAll();
});

setEntryBreakerBtn.addEventListener('click', () => {
  state.entryBreaker = estimateEntryBreaker(state.loadKw, state.phases);
  renderAll();
});

helperModeBtn.addEventListener('click', () => {
  state.entryBreaker = estimateEntryBreaker(state.loadKw, state.phases);
  state.placements = Array(getCurrentEnclosure().modules).fill(null);

  const seed = state.phases === 3
    ? ['relay-zubr-d40', 'uzo-abb-40', 'br-abb-c16', 'br-abb-c16', 'spd-opc']
    : ['uzo-sch-40', 'br-sch-c16', 'br-sch-c16', 'br-sch-c16'];

  let cursor = 0;
  seed.forEach((id) => {
    const item = catalog.find((x) => x.id === id);
    if (!item) return;
    while (cursor < state.placements.length && !canPlace(item, cursor)) cursor += 1;
    if (cursor < state.placements.length) {
      putItem(item, cursor);
      cursor += item.modules;
    }
  });
  renderAll();
});

orderBtn.addEventListener('click', () => {
  if (orderBtn.disabled) return;
  orderDialog.showModal();
});

closeDialogBtn.addEventListener('click', () => orderDialog.close());

orderForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(orderForm);
  const name = formData.get('name');
  orderDialog.close();
  alert(`Спасибо, ${name}! Заявка на сборку щита отправлена.`);
  orderForm.reset();
});
