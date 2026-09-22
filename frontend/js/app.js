/* ============================================================================
   El Desparche · Lógica de la interfaz (JavaScript sin dependencias)
   ========================================================================= */
'use strict';

/* -- Estado de la aplicación --------------------------------------------- */
const state = {
  view: 'home',           // 'home' | 'listado' | 'detalle'
  user: null,             // { name, email } | null
  selected: null,         // evento mostrado en el detalle
  reserved: false,        // reserva confirmada en el detalle actual
  authTab: 'login',       // 'login' | 'register'
  home: { search: '', pais: '', depto: '', ciudad: '', tipo: '' },
  list: { search: '', ciudad: 'Todas', fecha: 'Todas las fechas', estado: 'Todos', page: 1 }
};

/* -- Utilidades ----------------------------------------------------------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

/** Muestra u oculta un elemento mediante la clase utilitaria. */
function toggle(el, visible) {
  if (el) el.classList.toggle('is-hidden', !visible);
}

/** Formatea un número con separadores de miles en español de Colombia. */
function formatNumber(n) {
  return n.toLocaleString('es-CO');
}

/** ¿El estado del evento permite reservar? */
function canReserve(status) {
  return status !== 'Finalizado' && status !== 'Cancelado';
}

/* ============================================================================
   Navegación entre vistas
   ========================================================================= */
function setView(view) {
  state.view = view;
  toggle($('#view-home'), view === 'home');
  toggle($('#view-listado'), view === 'listado');
  toggle($('#view-detalle'), view === 'detalle');

  const activeNav = view === 'home' ? 'inicio' : 'eventos';
  $$('.navlink').forEach(btn => {
    if (btn.dataset.nav === activeNav) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  window.scrollTo({ top: 0 });
}

function goHome() { setView('home'); }
function goListado() { setView('listado'); renderListado(); }

function goDetalle(event) {
  state.selected = event;
  state.reserved = false;
  renderDetalle();
  setView('detalle');
}

/* ============================================================================
   Tarjeta de evento
   ========================================================================= */
function createCard(event) {
  const card = document.createElement('article');
  card.className = 'card';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.innerHTML = `
    <div class="card__media">
      <img src="${event.img}" alt="${event.title}" loading="lazy">
      <span class="badge" data-status="${event.status}">${event.status}</span>
    </div>
    <div class="card__body">
      <h3 class="card__title">${event.title}</h3>
      <p class="card__meta">${event.city} · ${event.date}</p>
      <div class="card__foot">
        <span class="card__price">${event.price}</span>
        <span class="card__cta">Ver evento →</span>
      </div>
    </div>`;

  card.addEventListener('click', () => goDetalle(event));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goDetalle(event);
    }
  });
  return card;
}

function renderGrid(container, events) {
  container.textContent = '';
  const frag = document.createDocumentFragment();
  events.forEach(ev => frag.appendChild(createCard(ev)));
  container.appendChild(frag);
}

/* ============================================================================
   Desplegables de filtro
   ========================================================================= */
const dropOptions = {
  pais: COUNTRIES,
  depto: [],
  ciudadHome: [],
  tipo: TYPES,
  ciudad: CITIES,
  fecha: DATES,
  estado: STATUSES
};

/** Rellena el menú de un desplegable y marca la opción activa. */
function renderDrop(key) {
  const drop = $(`[data-drop="${key}"]`);
  if (!drop) return;

  const menu = $('.drop__menu', drop);
  const label = $('.drop__label', drop);
  const current = getDropValue(key);
  const options = dropOptions[key] || [];

  label.textContent = current || drop.dataset.placeholder;

  menu.textContent = '';
  options.forEach(opt => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'drop__option';
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', String(opt === current));
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      setDropValue(key, opt);
      closeAllDrops();
    });
    li.appendChild(btn);
    menu.appendChild(li);
  });
}

function getDropValue(key) {
  switch (key) {
    case 'pais': return state.home.pais;
    case 'depto': return state.home.depto;
    case 'ciudadHome': return state.home.ciudad;
    case 'tipo': return state.home.tipo;
    case 'ciudad': return state.list.ciudad;
    case 'fecha': return state.list.fecha;
    case 'estado': return state.list.estado;
    default: return '';
  }
}

function setDropValue(key, value) {
  switch (key) {
    case 'pais':
      state.home.pais = value;
      state.home.depto = '';
      state.home.ciudad = '';
      dropOptions.depto = DEPARTMENTS[value] || [];
      dropOptions.ciudadHome = [];
      renderDrop('depto');
      renderDrop('ciudadHome');
      break;
    case 'depto':
      state.home.depto = value;
      state.home.ciudad = '';
      dropOptions.ciudadHome = CITIES_BY_DEPT[value] || [];
      renderDrop('ciudadHome');
      break;
    case 'ciudadHome':
      state.home.ciudad = value;
      break;
    case 'tipo':
      state.home.tipo = value;
      break;
    case 'ciudad':
      state.list.ciudad = value;
      state.list.page = 1;
      break;
    case 'fecha':
      state.list.fecha = value;
      state.list.page = 1;
      break;
    case 'estado':
      state.list.estado = value;
      state.list.page = 1;
      break;
  }

  renderDrop(key);
  if (['pais', 'depto', 'ciudadHome', 'tipo'].includes(key)) renderHome();
  else renderListado();
}

function closeAllDrops() {
  $$('.drop').forEach(drop => {
    $('.drop__toggle', drop).setAttribute('aria-expanded', 'false');
    $('.drop__menu', drop).classList.add('is-hidden');
  });
}

function initDrops() {
  Object.keys(dropOptions).forEach(renderDrop);

  $$('.drop').forEach(drop => {
    const toggleBtn = $('.drop__toggle', drop);
    const menu = $('.drop__menu', drop);

    toggleBtn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = toggleBtn.getAttribute('aria-expanded') === 'true';
      closeAllDrops();
      if (!isOpen) {
        toggleBtn.setAttribute('aria-expanded', 'true');
        menu.classList.remove('is-hidden');
      }
    });
  });

  document.addEventListener('click', closeAllDrops);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllDrops();
  });
}

/* ============================================================================
   Campos de búsqueda
   ========================================================================= */
function initSearch(inputId, onChange) {
  const input = $('#' + inputId);
  const clear = $(`[data-clear="${inputId}"]`);

  input.addEventListener('input', () => {
    toggle(clear, input.value.length > 0);
    onChange(input.value);
  });

  clear.addEventListener('click', () => {
    input.value = '';
    toggle(clear, false);
    onChange('');
    input.focus();
  });
}

/* ============================================================================
   Vista: Inicio
   ========================================================================= */
function filterHome() {
  const q = state.home.search.trim().toLowerCase();
  const ciudad = state.home.ciudad;

  return EVENTS.filter(e => {
    const matchesQuery = !q ||
      e.title.toLowerCase().includes(q) ||
      e.city.toLowerCase().includes(q);
    const matchesCity = !ciudad || e.city === ciudad;
    return matchesQuery && matchesCity;
  });
}

function renderHome() {
  renderGrid($('#home-grid'), filterHome().slice(0, 8));
}

/* ============================================================================
   Vista: Listado
   ========================================================================= */
function filterListado() {
  const q = state.list.search.trim().toLowerCase();
  const { ciudad, estado } = state.list;

  return EVENTS.filter(e => {
    const matchesQuery = !q ||
      e.title.toLowerCase().includes(q) ||
      e.city.toLowerCase().includes(q);
    const matchesCity = ciudad === 'Todas' || e.city === ciudad;
    const matchesStatus = estado === 'Todos' || e.status === estado;
    return matchesQuery && matchesCity && matchesStatus;
  });
}

function renderListado() {
  const results = filterListado();
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));

  if (state.list.page > pages) state.list.page = pages;

  const start = (state.list.page - 1) * PAGE_SIZE;
  const pageItems = results.slice(start, start + PAGE_SIZE);

  $('#list-count').textContent = `${results.length} ${results.length === 1 ? 'evento' : 'eventos'}`;

  renderGrid($('#list-grid'), pageItems);
  toggle($('#list-grid'), pageItems.length > 0);
  toggle($('#list-empty'), pageItems.length === 0);

  renderPagination(results.length, pages);
}

function renderPagination(total, pages) {
  const nav = $('#list-pagination');
  nav.textContent = '';

  if (pages <= 1) return;

  const makeBtn = (label, page, opts) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    if (opts.disabled) btn.disabled = true;
    if (opts.current) btn.setAttribute('aria-current', 'true');
    if (opts.ariaLabel) btn.setAttribute('aria-label', opts.ariaLabel);
    btn.addEventListener('click', () => {
      state.list.page = page;
      renderListado();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return btn;
  };

  nav.appendChild(makeBtn('←', state.list.page - 1, {
    disabled: state.list.page === 1,
    ariaLabel: 'Página anterior'
  }));

  for (let n = 1; n <= pages; n++) {
    nav.appendChild(makeBtn(String(n), n, { current: n === state.list.page }));
  }

  nav.appendChild(makeBtn('→', state.list.page + 1, {
    disabled: state.list.page === pages,
    ariaLabel: 'Página siguiente'
  }));
}

function resetListado() {
  state.list = { search: '', ciudad: 'Todas', fecha: 'Todas las fechas', estado: 'Todos', page: 1 };
  const input = $('#list-search');
  input.value = '';
  toggle($('[data-clear="list-search"]'), false);
  ['ciudad', 'fecha', 'estado'].forEach(renderDrop);
  renderListado();
}

/* ============================================================================
   Vista: Detalle
   ========================================================================= */
function renderDetalle() {
  const ev = state.selected;
  if (!ev) return;

  const active = canReserve(ev.status);

  $('#detail-crumb').textContent = ev.title;
  $('#detail-img').src = ev.img;
  $('#detail-img').alt = ev.title;
  $('#detail-title').textContent = ev.title;
  $('#detail-desc').textContent = ev.description;
  $('#detail-price').textContent = ev.price;
  $('#detail-venue').textContent = `${ev.venue} · ${ev.city}`;

  const badge = $('#detail-status');
  badge.textContent = ev.status;
  badge.dataset.status = ev.status;

  // Tabla de información
  const info = [
    ['Teatro / lugar', ev.venue],
    ['Ciudad', ev.city],
    ['Fecha y hora de inicio', ev.dateStart],
    ['Fin estimado', ev.dateEnd],
    ['Capacidad total', ev.capacity],
    ['Cupo disponible', `${formatNumber(ev.available)} entradas`],
    ['Precio base', ev.price],
    ['Observaciones', ev.observations]
  ];

  const dl = $('#detail-info');
  dl.textContent = '';
  info.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'info-row';
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    row.append(dt, dd);
    dl.appendChild(row);
  });

  // Mapa (OpenStreetMap embebido)
  const bbox = [ev.lng - 0.02, ev.lat - 0.015, ev.lng + 0.02, ev.lat + 0.015].join('%2C');
  $('#detail-map').src =
    `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${ev.lat}%2C${ev.lng}`;
  $('#detail-map').title = `Mapa de ${ev.venue}`;
  $('#detail-map-link').href =
    `https://www.openstreetmap.org/?mlat=${ev.lat}&mlon=${ev.lng}&zoom=15`;

  // Bloque de reserva
  const btn = $('#btn-reservar');
  const slots = $('#reserve-slots');

  btn.disabled = !active;
  slots.textContent = `${formatNumber(ev.available)} cupos disponibles`;

  toggle(btn, !state.reserved);
  toggle($('#reserve-done'), state.reserved);
  toggle(slots, active && !state.reserved);
  toggle($('#reserve-off'), !active);
}

function handleReservar() {
  if (!state.user) {
    openAuth('login');
    return;
  }
  state.reserved = true;
  renderDetalle();
}

/* ============================================================================
   Autenticación
   ========================================================================= */
const authModal = $('#auth-modal');

function openAuth(tab) {
  setAuthTab(tab);
  if (typeof authModal.showModal === 'function') authModal.showModal();
  else authModal.setAttribute('open', '');
}

function closeAuth() {
  if (typeof authModal.close === 'function') authModal.close();
  else authModal.removeAttribute('open');
  $('#auth-form').reset();
  toggle($('#auth-error'), false);
}

function setAuthTab(tab) {
  state.authTab = tab;

  $$('.tabs button').forEach(btn => {
    btn.setAttribute('aria-selected', String(btn.dataset.tab === tab));
  });

  toggle($('#field-name'), tab === 'register');
  $('#auth-submit').textContent = tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
  $('#auth-switch-text').textContent = tab === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? ';
  $('#auth-switch').textContent = tab === 'login' ? 'Regístrate' : 'Inicia sesión';
  $('#auth-password').autocomplete = tab === 'login' ? 'current-password' : 'new-password';
  toggle($('#auth-error'), false);
}

function handleAuthSubmit(e) {
  e.preventDefault();

  const name = $('#auth-name').value.trim();
  const email = $('#auth-email').value.trim();
  const password = $('#auth-password').value;
  const errorEl = $('#auth-error');

  const fail = msg => {
    errorEl.textContent = msg;
    toggle(errorEl, true);
  };

  if (!email || !password) return fail('Completa todos los campos.');
  if (state.authTab === 'register' && !name) return fail('Ingresa tu nombre.');
  if (password.length < 6) return fail('Mínimo 6 caracteres.');

  login({
    name: state.authTab === 'register' ? name : email.split('@')[0],
    email: email
  });
}

function login(user) {
  state.user = user;
  renderAuthState();
  closeAuth();
}

function logout() {
  state.user = null;
  renderAuthState();
}

function renderAuthState() {
  const signedIn = Boolean(state.user);
  toggle($('#auth-guest'), !signedIn);
  toggle($('#auth-user'), signedIn);

  if (signedIn) {
    $('#user-name').textContent = state.user.name;
    $('#user-initial').textContent = state.user.name.charAt(0).toUpperCase();
  }
}

/* ============================================================================
   Arranque
   ========================================================================= */
function init() {
  initDrops();

  initSearch('home-search', value => {
    state.home.search = value;
    renderHome();
  });

  initSearch('list-search', value => {
    state.list.search = value;
    state.list.page = 1;
    renderListado();
  });

  // Navegación
  $$('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.nav === 'inicio') goHome();
      else goListado();
    });
  });

  // Autenticación
  $$('[data-auth-open]').forEach(btn => {
    btn.addEventListener('click', () => openAuth(btn.dataset.authOpen));
  });
  $$('.tabs button').forEach(btn => {
    btn.addEventListener('click', () => setAuthTab(btn.dataset.tab));
  });
  $('#auth-switch').addEventListener('click', () => {
    setAuthTab(state.authTab === 'login' ? 'register' : 'login');
  });
  $('#auth-form').addEventListener('submit', handleAuthSubmit);
  $('#btn-logout').addEventListener('click', logout);

  // Cerrar el modal al hacer clic en el fondo
  authModal.addEventListener('click', e => {
    if (e.target === authModal) closeAuth();
  });
  authModal.addEventListener('cancel', e => {
    e.preventDefault();
    closeAuth();
  });

  // Reserva y filtros
  $('#btn-reservar').addEventListener('click', handleReservar);
  $('#list-reset').addEventListener('click', resetListado);

  renderAuthState();
  renderHome();
  renderListado();
  setView('home');
}

document.addEventListener('DOMContentLoaded', init);
