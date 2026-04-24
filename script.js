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
  components: [],
};

const enclosureSelect = document.querySelector('#enclosure-select');
const phaseSelect = document.querySelector('#phase-select');
const loadInput = document.querySelector('#load-input');
const entryBreakerHint = document.querySelector('#entry-breaker-hint');
const componentList = document.querySelector('#component-list');
const summaryLines = document.querySelector('#summary-lines');

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

const formatMoney = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;

function getCurrentEnclosure() {
  return enclosures.find((box) => box.id === state.enclosureId);
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

function getUsedModules() {
  const entryModules = state.entryBreaker?.modules || 0;
  const componentModules = state.components.reduce((sum, item) => sum + item.modules, 0);
  return entryModules + componentModules;
}

function getAssemblyCost() {
  const base = 2500;
  const perItem = state.components.length * 140;
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
    node.addEventListener('click', () => {
      state.components.push(item);
      renderAll();
    });
    componentList.append(node);
  });
}

function renderEntryBreakerHint() {
  const suggestion = estimateEntryBreaker(Number(state.loadKw), Number(state.phases));
  const enclosure = getCurrentEnclosure();
  const used = getUsedModules();
  entryBreakerHint.textContent = `Рекомендуемый вводной автомат: ${suggestion.name} (${suggestion.current}A расчетный ток).`
    + ` Корпус: ${enclosure.modules} модулей, занято сейчас: ${used}.`;
}

function renderSummary() {
  summaryLines.innerHTML = '';
  if (state.entryBreaker) {
    const line = document.createElement('div');
    line.className = 'summary-item';
    line.innerHTML = `<span>${state.entryBreaker.name}</span><span>1 шт.</span><strong>${formatMoney(state.entryBreaker.price)}</strong>`;
    summaryLines.append(line);
  }

  state.components.forEach((item, index) => {
    const line = document.createElement('div');
    line.className = 'summary-item';
    line.innerHTML = `
      <span>${item.name}</span>
      <span>1 шт.</span>
      <div><strong>${formatMoney(item.price)}</strong> <button data-index="${index}" title="Удалить">×</button></div>`;
    const removeButton = line.querySelector('button');
    removeButton.addEventListener('click', () => {
      state.components.splice(Number(removeButton.dataset.index), 1);
      renderAll();
    });
    summaryLines.append(line);
  });

  if (!state.entryBreaker && state.components.length === 0) {
    summaryLines.innerHTML = '<p>Добавьте компоненты слева для начала конфигурации.</p>';
  }
}

function renderTotals() {
  const componentsTotal = (state.entryBreaker?.price || 0)
    + state.components.reduce((sum, item) => sum + item.price, 0);
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
  renderEntryBreakerHint();
  renderSummary();
  renderTotals();
}

renderEnclosures();
renderCatalog();
renderAll();

enclosureSelect.addEventListener('change', (event) => {
  state.enclosureId = event.target.value;
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
  const recommended = estimateEntryBreaker(state.loadKw, state.phases);
  state.entryBreaker = recommended;

  if (state.phases === 3) {
    state.components.push(catalog.find((x) => x.id === 'relay-zubr-d40'));
    state.components.push(catalog.find((x) => x.id === 'uzo-abb-40'));
  } else {
    state.components.push(catalog.find((x) => x.id === 'uzo-sch-40'));
  }
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
