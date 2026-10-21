// Lale, panou de administrare demo. Fără server: citește și scrie în DemoStore (localStorage).
// Iconițe inline, decorative (butoanele au aria-label).
const ICON_EDIT = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 20h4L19 9l-4-4L4 16v4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const ICON_TRASH = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

(() => {
  const Store = window.DemoStore;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SESSION = 'lale-demo:session';

  const dayLong = new Intl.DateTimeFormat('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
  const dayShort = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short' });
  const asDate = (iso) => new Date(`${iso}T12:00:00`);
  const dayLabel = (iso) => {
    if (iso === Store.today()) return 'Azi';
    if (iso === Store.isoDay(1)) return 'Mâine';
    const label = dayLong.format(asDate(iso));
    return label.charAt(0).toUpperCase() + label.slice(1);
  };
  const STATUS = {
    pending: { label: 'În așteptare', cls: 'saffron' },
    confirmed: { label: 'Confirmată', cls: 'pistachio' },
    cancelled: { label: 'Anulată', cls: 'muted' },
  };

  /* ---------- Toasturi, cu „Anulează” pentru ștergeri ---------- */
  const toastBox = $('[data-toasts]');
  const toast = (message, undo) => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${esc(message)}</span>${undo ? '<button type="button">Anulează</button>' : ''}`;
    toastBox.append(el);
    let timer;
    const close = () => {
      clearTimeout(timer);
      el.classList.add('is-leaving');
      const remove = () => el.remove();
      if (reduceMotion.matches) remove(); else el.addEventListener('transitionend', remove, { once: true });
      setTimeout(remove, 400);
    };
    if (undo) el.querySelector('button').addEventListener('click', () => { undo(); close(); });
    timer = setTimeout(close, undo ? 6000 : 3200);
  };

  /* ---------- Intrare demo ---------- */
  const login = $('[data-login]');
  const shell = $('[data-shell]');
  const enter = (animate) => {
    try { sessionStorage.setItem(SESSION, '1'); } catch (_) { /* ignorat */ }
    const show = () => {
      login.hidden = true;
      shell.hidden = false;
      route();
    };
    if (animate && !reduceMotion.matches) {
      login.classList.add('is-leaving');
      setTimeout(show, 220);
    } else show();
  };
  $('[data-enter]').addEventListener('click', () => enter(true));
  $('[data-exit]').addEventListener('click', () => {
    try { sessionStorage.removeItem(SESSION); } catch (_) { /* ignorat */ }
    shell.hidden = true;
    login.hidden = false;
    login.classList.remove('is-leaving');
    $('[data-enter]').focus();
  });

  /* ---------- Rutare pe hash: URL-ul reflectă secțiunea ---------- */
  const TITLES = { panou: 'Azi', rezervari: 'Rezervări', meniu: 'Meniu', oferte: 'Oferte', setari: 'Date demo' };
  let current = null;
  const route = () => {
    if (shell.hidden) return;
    const name = TITLES[location.hash.slice(1)] ? location.hash.slice(1) : 'panou';
    $$('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== name; });
    $$('[data-nav]').forEach((a) => {
      if (a.dataset.nav === name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    $('[data-view-title]').textContent = TITLES[name];
    document.title = `${TITLES[name]} · Admin Lale (demo)`;
    const changed = current !== name;
    current = name;
    renderAll();
    if (changed) $('#continut').focus({ preventScroll: true });
  };
  window.addEventListener('hashchange', route);

  const renderAll = () => {
    renderCounts();
    if (current === 'panou') renderDashboard();
    if (current === 'rezervari') renderReservations();
    if (current === 'meniu') renderMenu();
    if (current === 'oferte') renderOffers();
  };
  window.addEventListener('lale:change', () => renderAll());

  $('[data-today]').textContent = dayLong.format(new Date());

  const renderCounts = () => {
    const pending = Store.get('reservations').filter((r) => r.status === 'pending' && r.date >= Store.today()).length;
    const badge = $('[data-count="pending"]');
    badge.textContent = pending ? String(pending) : '';
    badge.setAttribute('aria-label', pending ? `${pending} în așteptare` : '');
  };

  /* ---------- Azi ---------- */
  const renderDashboard = () => {
    const today = Store.today();
    const res = Store.get('reservations');
    const todays = res.filter((r) => r.date === today && r.status !== 'cancelled');
    const guests = todays.reduce((sum, r) => sum + Number(r.people || 0), 0);
    const pending = res.filter((r) => r.status === 'pending' && r.date >= today).length;
    const menu = Store.get('menu');
    const off = menu.flatMap((c) => c.items.filter((i) => !i.available).map((i) => ({ ...i, cat: c.name })));
    const offersLive = Store.get('offers').filter((o) => o.active && (!o.from || o.from <= today) && (!o.to || o.to >= today)).length;

    const stats = [
      { n: todays.length, label: todays.length === 1 ? 'rezervare azi' : 'rezervări azi', hint: `${guests} ${guests === 1 ? 'persoană' : 'persoane'}`, tone: 'pomegranate', href: '#rezervari' },
      { n: pending, label: 'cereri în așteptare', hint: pending ? 'De confirmat' : 'Nimic de confirmat', tone: 'saffron', href: '#rezervari' },
      { n: off.length, label: 'produse indisponibile', hint: `din ${menu.reduce((s, c) => s + c.items.length, 0)} în meniu`, tone: 'pistachio', href: '#meniu' },
      { n: offersLive, label: 'oferte pe site', hint: offersLive ? 'Vizibile acum' : 'Nicio ofertă activă', tone: 'sumac', href: '#oferte' },
    ];
    $('[data-stats]').innerHTML = stats.map((s, i) => `
      <a class="stat stat--${s.tone}" href="${s.href}" style="--i:${i}">
        <span class="stat__n" data-n="${s.n}">${s.n}</span>
        <span class="stat__label">${s.label}</span>
        <span class="stat__hint">${esc(s.hint)}</span>
      </a>`).join('');

    const upcoming = res
      .filter((r) => r.date >= today && r.status !== 'cancelled')
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 5);
    $('[data-upcoming]').innerHTML = upcoming.length ? upcoming.map((r) => `
      <li class="mini">
        <span class="mini__time"><strong>${esc(r.time)}</strong><small>${esc(dayLabel(r.date))}</small></span>
        <span class="mini__main">${esc(r.name)}<small>${r.people} pers.${r.notes ? ` · ${esc(r.notes)}` : ''}</small></span>
        ${r.status === 'pending'
          ? `<button class="a-btn a-btn--sm a-btn--ok" type="button" data-confirm="${r.id}">Confirmă</button>`
          : `<span class="chip chip--pistachio">Confirmată</span>`}
      </li>`).join('') : '<li class="empty">Nicio rezervare de azi încolo. Adaugă una din „Rezervări”.</li>';

    $('[data-unavailable]').innerHTML = off.length ? off.map((i) => `
      <li class="mini">
        <span class="mini__main">${esc(i.name)}<small>${esc(i.cat)}</small></span>
        <button class="a-btn a-btn--sm" type="button" data-avail="${i.id}">Repune în meniu</button>
      </li>`).join('') : '<li class="empty">Tot meniul e disponibil.</li>';
  };

  /* ---------- Rezervări ---------- */
  let resFilter = 'all';
  let resRange = 'upcoming';
  let lastAddedRes = null;

  $('[data-res-filter]').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    resFilter = btn.dataset.value;
    $$('[data-res-filter] button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    renderReservations();
  });
  $('[data-res-range]').addEventListener('change', (e) => { resRange = e.target.value; renderReservations(); });

  const setStatus = (id, status) => {
    const list = Store.get('reservations');
    const r = list.find((x) => x.id === id);
    if (!r) return;
    r.status = status;
    Store.set('reservations', list);
    toast(status === 'confirmed' ? `Rezervarea pentru ${r.name} a fost confirmată.` : `Rezervarea pentru ${r.name} a fost anulată.`);
  };

  const renderReservations = () => {
    const today = Store.today();
    let list = Store.get('reservations');
    if (resRange === 'upcoming') list = list.filter((r) => r.date >= today);
    if (resRange === 'today') list = list.filter((r) => r.date === today);
    if (resFilter !== 'all') list = list.filter((r) => r.status === resFilter);
    list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    const box = $('[data-res-list]');
    if (!list.length) {
      box.innerHTML = '<p class="empty empty--big">Nicio rezervare pentru filtrul ales. Schimbă filtrul sau adaugă o rezervare primită la telefon.</p>';
      return;
    }
    const groups = list.reduce((acc, r) => ((acc[r.date] ||= []).push(r), acc), {});
    box.innerHTML = Object.entries(groups).map(([date, rows]) => `
      <section class="day">
        <h3 class="day__title">${esc(dayLabel(date))}<small>${rows.length} ${rows.length === 1 ? 'rezervare' : 'rezervări'}, ${rows.reduce((s, r) => s + Number(r.people || 0), 0)} pers.</small></h3>
        <ul class="res-list">
          ${rows.map((r) => `
            <li class="res${r.status === 'cancelled' ? ' is-cancelled' : ''}${r.id === lastAddedRes ? ' is-new' : ''}">
              <span class="res__time">${esc(r.time)}</span>
              <span class="res__who">
                <span class="res__name"><strong>${esc(r.name)}</strong>${r.demo ? '<span class="chip chip--ghost">exemplu</span>' : ''}</span>
                <small>${r.people} ${Number(r.people) === 1 ? 'persoană' : 'persoane'}${r.phone ? ` · <a href="tel:${esc(r.phone.replace(/\s/g, ''))}">${esc(r.phone)}</a>` : ''}</small>
                ${r.notes ? `<small class="res__notes">${esc(r.notes)}</small>` : ''}
              </span>
              <span class="chip chip--${STATUS[r.status].cls}">${STATUS[r.status].label}</span>
              <span class="res__actions">
                ${r.status !== 'confirmed' ? `<button class="a-btn a-btn--sm a-btn--ok" type="button" data-confirm="${r.id}">Confirmă</button>` : ''}
                ${r.status !== 'cancelled' ? `<button class="a-btn a-btn--sm" type="button" data-cancel="${r.id}">Anulează</button>` : ''}
                <button class="icon-btn" type="button" data-del-res="${r.id}" aria-label="Șterge rezervarea pentru ${esc(r.name)}">${ICON_TRASH}</button>
              </span>
            </li>`).join('')}
        </ul>
      </section>`).join('');
    lastAddedRes = null;
  };

  /* ---------- Meniu ---------- */
  let menuCat = 'all';
  let menuQuery = '';
  let lastAddedItem = null;

  $('[data-menu-search]').addEventListener('input', (e) => { menuQuery = e.target.value.trim().toLowerCase(); renderMenu(); });
  $('[data-menu-cats]').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    menuCat = btn.dataset.value;
    renderMenu();
  });

  const findItem = (menu, id) => {
    for (const cat of menu) {
      const idx = cat.items.findIndex((i) => i.id === id);
      if (idx > -1) return { cat, idx, item: cat.items[idx] };
    }
    return null;
  };

  const renderMenu = () => {
    const menu = Store.get('menu');
    $('[data-menu-cats]').innerHTML = [{ id: 'all', name: 'Toate' }, ...menu].map((c) =>
      `<button type="button" data-value="${c.id}" aria-pressed="${menuCat === c.id}">${esc(c.name)}${c.items ? ` <small>${c.items.length}</small>` : ''}</button>`).join('');

    const cats = menu.filter((c) => menuCat === 'all' || c.id === menuCat);
    const html = cats.map((cat) => {
      const items = cat.items.filter((i) => !menuQuery || `${i.name} ${i.sub}`.toLowerCase().includes(menuQuery));
      if (!items.length) return '';
      return `
        <section class="mcat">
          <h3 class="mcat__title">${esc(cat.name)}${cat.tr ? ` <small lang="tr">${esc(cat.tr)}</small>` : ''}</h3>
          <ul class="mlist">
            ${items.map((i) => `
              <li class="mitem${i.available ? '' : ' is-off'}${i.id === lastAddedItem ? ' is-new' : ''}">
                <span class="mitem__name"><strong lang="tr">${esc(i.name)}</strong>${i.sub ? `<small>${esc(i.sub)}</small>` : ''}</span>
                <label class="price">
                  <span class="visually-hidden">Preț pentru ${esc(i.name)}, în lei</span>
                  <input type="number" inputmode="decimal" min="0" step="0.5" value="${i.price}" data-price="${i.id}">
                  <span aria-hidden="true">lei</span>
                </label>
                <button class="switch" type="button" role="switch" aria-checked="${i.available}" data-toggle="${i.id}">
                  <span class="switch__track" aria-hidden="true"><span class="switch__thumb"></span></span>
                  <span class="switch__label">${i.available ? 'Disponibil' : 'Indisponibil'}</span>
                  <span class="visually-hidden"> ${esc(i.name)}</span>
                </button>
                <span class="mitem__actions">
                  <button class="icon-btn" type="button" data-edit-item="${i.id}" aria-label="Editează ${esc(i.name)}">${ICON_EDIT}</button>
                  <button class="icon-btn" type="button" data-del-item="${i.id}" aria-label="Șterge ${esc(i.name)}">${ICON_TRASH}</button>
                </span>
              </li>`).join('')}
          </ul>
        </section>`;
    }).join('');
    $('[data-menu-list]').innerHTML = html || `<p class="empty empty--big">Niciun preparat pentru „${esc(menuQuery)}”. Verifică scrierea sau adaugă un produs nou.</p>`;
    lastAddedItem = null;
  };

  // Preț: se salvează la „change” (Enter sau ieșire din câmp).
  document.addEventListener('change', (e) => {
    const input = e.target.closest('[data-price]');
    if (!input) return;
    const value = Number(input.value);
    const menu = Store.get('menu');
    const found = findItem(menu, input.dataset.price);
    if (!found) return;
    if (!Number.isFinite(value) || value < 0 || input.value === '') {
      input.value = found.item.price;
      toast('Prețul trebuie să fie un număr pozitiv. Am păstrat valoarea anterioară.');
      return;
    }
    if (value === found.item.price) return;
    const before = found.item.price;
    found.item.price = Math.round(value * 100) / 100;
    Store.set('menu', menu);
    toast(`${found.item.name}: ${Store.formatPrice(before)} → ${Store.formatPrice(found.item.price)}`);
  });

  /* ---------- Oferte ---------- */
  let lastAddedOffer = null;
  const offerCard = (o) => `
    <div class="offer-card__inner offer-card--${esc(o.tone || 'pomegranate')}">
      <p class="offer-card__title">${esc(o.title || 'Titlul ofertei')}</p>
      ${o.text ? `<p class="offer-card__text">${esc(o.text)}</p>` : ''}
      <p class="offer-card__meta">${o.price ? `<strong>${esc(o.price)}</strong>` : ''}${o.to ? `<span>Până pe ${dayShort.format(asDate(o.to))}</span>` : ''}<span class="offer-card__tag">Ofertă demo</span></p>
    </div>`;

  const offerState = (o) => {
    const today = Store.today();
    if (!o.active) return { label: 'Ascunsă', cls: 'muted' };
    if (o.to && o.to < today) return { label: 'Expirată', cls: 'muted' };
    if (o.from && o.from > today) return { label: `Programată, din ${dayShort.format(asDate(o.from))}`, cls: 'saffron' };
    return { label: 'Pe site acum', cls: 'pistachio' };
  };

  const renderOffers = () => {
    const offers = Store.get('offers');
    $('[data-offer-list]').innerHTML = offers.length ? offers.map((o) => {
      const st = offerState(o);
      return `
        <li class="offer-item${o.id === lastAddedOffer ? ' is-new' : ''}">
          <div class="offer-card">${offerCard(o)}</div>
          <div class="offer-item__bar">
            <span class="chip chip--${st.cls}">${esc(st.label)}</span>
            <button class="switch" type="button" role="switch" aria-checked="${o.active}" data-offer-toggle="${o.id}">
              <span class="switch__track" aria-hidden="true"><span class="switch__thumb"></span></span>
              <span class="switch__label">Pe site</span>
              <span class="visually-hidden"> ${esc(o.title)}</span>
            </button>
            <span class="offer-item__actions">
              <button class="icon-btn" type="button" data-edit-offer="${o.id}" aria-label="Editează oferta ${esc(o.title)}">${ICON_EDIT}</button>
              <button class="icon-btn" type="button" data-del-offer="${o.id}" aria-label="Șterge oferta ${esc(o.title)}">${ICON_TRASH}</button>
            </span>
          </div>
        </li>`;
    }).join('') : '<li class="empty empty--big">Nicio ofertă încă. Creează una cu „Ofertă nouă”.</li>';
    lastAddedOffer = null;
  };

  /* ---------- Acțiuni delegate ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const d = t.dataset;

    if (d.confirm) setStatus(d.confirm, 'confirmed');
    else if (d.cancel) setStatus(d.cancel, 'cancelled');
    else if (d.delRes) {
      const before = Store.get('reservations');
      const r = before.find((x) => x.id === d.delRes);
      Store.set('reservations', before.filter((x) => x.id !== d.delRes));
      toast(`Rezervarea pentru ${r?.name || ''} a fost ștearsă.`, () => Store.set('reservations', before));
    } else if (d.toggle || d.avail) {
      const id = d.toggle || d.avail;
      const menu = Store.get('menu');
      const found = findItem(menu, id);
      if (!found) return;
      found.item.available = d.avail ? true : !found.item.available;
      Store.set('menu', menu);
      toast(`${found.item.name} este acum ${found.item.available ? 'disponibil' : 'indisponibil'} pe site.`);
      if (d.toggle) requestAnimationFrame(() => $(`[data-toggle="${id}"]`)?.focus());
    } else if (d.delItem) {
      const before = Store.get('menu');
      const menu = Store.get('menu');
      const found = findItem(menu, d.delItem);
      if (!found) return;
      found.cat.items.splice(found.idx, 1);
      Store.set('menu', menu);
      toast(`${found.item.name} a fost scos din meniu.`, () => Store.set('menu', before));
    } else if (d.editItem) openItem(d.editItem);
    else if (d.offerToggle) {
      const offers = Store.get('offers');
      const o = offers.find((x) => x.id === d.offerToggle);
      o.active = !o.active;
      Store.set('offers', offers);
      toast(o.active ? `„${o.title}” apare pe site.` : `„${o.title}” a fost ascunsă de pe site.`);
      requestAnimationFrame(() => $(`[data-offer-toggle="${o.id}"]`)?.focus());
    } else if (d.editOffer) openOffer(d.editOffer);
    else if (d.delOffer) {
      const before = Store.get('offers');
      const o = before.find((x) => x.id === d.delOffer);
      Store.set('offers', before.filter((x) => x.id !== d.delOffer));
      toast(`Oferta „${o?.title || ''}” a fost ștearsă.`, () => Store.set('offers', before));
    }
  });

  $('[data-new-item]').addEventListener('click', () => openItem(null));
  $('[data-new-offer]').addEventListener('click', () => openOffer(null));
  $('[data-new-res]').addEventListener('click', () => openRes());

  /* ---------- Dialog: produs ---------- */
  const dlgItem = $('#dlg-item');
  const itemForm = $('[data-item-form]');
  let editingItem = null;
  const openItem = (id) => {
    const menu = Store.get('menu');
    itemForm.elements.cat.innerHTML = menu.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    const found = id ? findItem(menu, id) : null;
    editingItem = found ? id : null;
    $('#dlg-item-title').textContent = found ? 'Editează produsul' : 'Produs nou';
    itemForm.elements.name.value = found?.item.name || '';
    itemForm.elements.sub.value = found?.item.sub || '';
    itemForm.elements.price.value = found ? found.item.price : '';
    itemForm.elements.cat.value = found ? found.cat.id : (menuCat !== 'all' ? menuCat : menu[0].id);
    $('[data-item-error]').hidden = true;
    dlgItem.showModal();
  };
  itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.submitter?.value !== 'save') { dlgItem.close(); return; }
    const f = itemForm.elements;
    const price = Number(f.price.value);
    if (!f.name.value.trim() || f.price.value === '' || !Number.isFinite(price) || price < 0) {
      $('[data-item-error]').hidden = false;
      (f.name.value.trim() ? f.price : f.name).focus();
      return;
    }
    const menu = Store.get('menu');
    const target = menu.find((c) => c.id === f.cat.value);
    const data = { name: f.name.value.trim(), sub: f.sub.value.trim(), price: Math.round(price * 100) / 100 };
    if (editingItem) {
      const found = findItem(menu, editingItem);
      Object.assign(found.item, data);
      if (found.cat !== target) {
        found.cat.items.splice(found.idx, 1);
        target.items.push(found.item);
      }
      lastAddedItem = editingItem;
      toast(`${data.name} a fost actualizat.`);
    } else {
      const item = { id: Store.uid('i'), ...data, available: true };
      target.items.push(item);
      lastAddedItem = item.id;
      toast(`${data.name} a fost adăugat în „${target.name}”.`);
    }
    Store.set('menu', menu);
    dlgItem.close();
  });

  /* ---------- Dialog: ofertă, cu previzualizare live ---------- */
  const dlgOffer = $('#dlg-offer');
  const offerForm = $('[data-offer-form]');
  let editingOffer = null;
  const readOffer = () => {
    const f = offerForm.elements;
    return { title: f.title.value.trim(), text: f.text.value.trim(), price: f.price.value.trim(), from: f.from.value, to: f.to.value, tone: f.tone.value, active: f.active.checked };
  };
  const paintPreview = () => { $('[data-offer-preview]').innerHTML = offerCard(readOffer()); };
  offerForm.addEventListener('input', paintPreview);
  const openOffer = (id) => {
    const o = id ? Store.get('offers').find((x) => x.id === id) : null;
    editingOffer = o ? id : null;
    $('#dlg-offer-title').textContent = o ? 'Editează oferta' : 'Ofertă nouă';
    const f = offerForm.elements;
    f.title.value = o?.title || '';
    f.text.value = o?.text || '';
    f.price.value = o?.price || '';
    f.from.value = o?.from || Store.today();
    f.to.value = o?.to || Store.isoDay(14);
    f.tone.value = o?.tone || 'pomegranate';
    f.active.checked = o ? o.active : true;
    $('[data-offer-error]').hidden = true;
    paintPreview();
    dlgOffer.showModal();
  };
  offerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.submitter?.value !== 'save') { dlgOffer.close(); return; }
    const data = readOffer();
    if (!data.title || (data.from && data.to && data.to < data.from)) {
      $('[data-offer-error]').hidden = false;
      offerForm.elements[data.title ? 'to' : 'title'].focus();
      return;
    }
    const offers = Store.get('offers');
    if (editingOffer) {
      Object.assign(offers.find((x) => x.id === editingOffer), data);
      lastAddedOffer = editingOffer;
      toast(`Oferta „${data.title}” a fost actualizată.`);
    } else {
      const o = { id: Store.uid('o'), ...data };
      offers.unshift(o);
      lastAddedOffer = o.id;
      toast(data.active ? `Oferta „${data.title}” a fost creată și apare pe site.` : `Oferta „${data.title}” a fost creată, ascunsă.`);
    }
    Store.set('offers', offers);
    dlgOffer.close();
  });

  /* ---------- Dialog: rezervare manuală ---------- */
  const dlgRes = $('#dlg-res');
  const resForm = $('[data-res-form]');
  const openRes = () => {
    resForm.reset();
    resForm.elements.date.value = Store.today();
    resForm.elements.date.min = Store.today();
    $('[data-res-error]').hidden = true;
    dlgRes.showModal();
  };
  resForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.submitter?.value !== 'save') { dlgRes.close(); return; }
    const f = resForm.elements;
    if (!f.name.value.trim() || !f.date.value || !f.time.value) {
      $('[data-res-error]').hidden = false;
      (!f.name.value.trim() ? f.name : !f.date.value ? f.date : f.time).focus();
      return;
    }
    const r = {
      id: Store.uid('r'), name: f.name.value.trim(), phone: f.phone.value.trim(),
      date: f.date.value, time: f.time.value, people: Math.max(1, Number(f.people.value) || 1),
      notes: f.notes.value.trim(), status: f.confirmed.checked ? 'confirmed' : 'pending', created: Date.now(),
    };
    lastAddedRes = r.id;
    Store.set('reservations', [r, ...Store.get('reservations')]);
    toast(`Rezervarea pentru ${r.name} a fost adăugată.`);
    dlgRes.close();
  });

  /* ---------- Date demo ---------- */
  const dlgConfirm = $('#dlg-confirm');
  $('[data-reset]').addEventListener('click', () => dlgConfirm.showModal());
  dlgConfirm.addEventListener('close', () => {
    if (dlgConfirm.returnValue !== 'reset') return;
    Store.reset();
    toast('Datele demo au fost resetate.');
  });
  $('[data-export]').addEventListener('click', () => {
    const data = { exportat: new Date().toISOString(), meniu: Store.get('menu'), oferte: Store.get('offers'), rezervari: Store.get('reservations') };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `lale-demo-${Store.today()}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Fișierul JSON a fost descărcat.');
  });

  /* ---------- Pornire ---------- */
  let hasSession = false;
  try { hasSession = sessionStorage.getItem(SESSION) === '1'; } catch (_) { /* ignorat */ }
  if (hasSession) enter(false);
})();
