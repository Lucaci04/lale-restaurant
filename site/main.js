// Lale, site public. Meniul și ofertele vin din DemoStore,
// pe care panoul de administrare demo îl poate modifica (doar în acest browser).
document.documentElement.classList.add('js');

const Store = window.DemoStore;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

// Meniu: taburi accesibile (WAI-ARIA tabs), verticale pe desktop. Fiecare categorie își are lista de preparate.
(() => {
  const nav = document.querySelector('[data-menu-nav]');
  const host = document.querySelector('[data-menu-panels]');
  if (!nav || !host || !Store) return;
  let selectedId = null;
  let tabs = [];
  let panels = [];
  const vertical = window.matchMedia('(min-width: 960px)');

  // Nume, puncte de ghidaj și preț pe un rând; numele românesc și starea dedesubt.
  const itemHtml = (item) => `
    <li class="menu-item${item.available ? '' : ' is-off'}">
      <span class="menu-item__name" lang="tr">${escapeHtml(item.name)}</span>
      <span class="menu-item__dots" aria-hidden="true"></span>
      <span class="menu-item__price">${Store.formatPrice(item.price)}</span>
      ${item.sub ? `<span class="menu-item__sub">${escapeHtml(item.sub)}</span>` : ''}
      ${item.available ? '' : '<span class="menu-item__off">Indisponibil momentan</span>'}
    </li>`;

  const render = () => {
    const menu = Store.get('menu').filter((cat) => cat.items.length);
    if (!menu.length) {
      nav.innerHTML = '';
      host.innerHTML = '<p class="note">Meniul nu are încă produse. Le poți adăuga din panoul de administrare demo.</p>';
      return;
    }
    if (!menu.some((cat) => cat.id === selectedId)) selectedId = (menu.find((c) => c.id === 'c1') || menu[0]).id;

    nav.innerHTML = `<div role="tablist" aria-label="Categorii de meniu" aria-orientation="${vertical.matches ? 'vertical' : 'horizontal'}">${menu.map((cat) => {
      const on = cat.id === selectedId;
      return `<button class="menu-tab" id="tab-${cat.id}" role="tab" type="button" aria-controls="panel-${cat.id}" aria-selected="${on}"${on ? '' : ' tabindex="-1"'}>${escapeHtml(cat.name)} <small>${cat.items.length}</small></button>`;
    }).join('')}</div>`;

    host.innerHTML = menu.map((cat) => `
      <section class="menu-panel" id="panel-${cat.id}" role="tabpanel" aria-labelledby="tab-${cat.id}" tabindex="0"${cat.id === selectedId ? '' : ' hidden'}>
        <h3 class="menu-panel__title">${escapeHtml(cat.name)}${cat.tr ? ` <span lang="tr">${escapeHtml(cat.tr)}</span>` : ''}</h3>
        <ul class="menu-list">${cat.items.map(itemHtml).join('')}</ul>
      </section>`).join('');
    wire();
  };

  // Rândurile se așază în ordine, doar la click; la tastatură și cu reduced motion schimbarea e instantanee.
  const playSwitch = (panel) => {
    if (reduceMotion.matches || !panel.animate) return;
    [...panel.querySelectorAll('.menu-item')].slice(0, 14).forEach((row, i) => {
      row.getAnimations().forEach((a) => a.cancel());
      row.animate(
        [{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
        { duration: 420, delay: 40 + i * 30, easing: EASE_OUT, fill: 'backwards' },
      );
    });
  };

  const select = (index, { focus = false, fromPointer = false } = {}) => {
    const previous = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    const tab = tabs[index];
    selectedId = tab.id.replace('tab-', '');
    if (!vertical.matches) {
      const list = tab.parentElement;
      list.scrollTo({ left: tab.offsetLeft - list.clientWidth / 2 + tab.offsetWidth / 2, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }
    if (focus) tab.focus();
    if (fromPointer && previous !== index) {
      // Pe desktop lista e lipită de ecran; dacă titlul categoriei noi a rămas deasupra, derulează la el.
      if (vertical.matches && panels[index].getBoundingClientRect().top < 0) {
        panels[index].scrollIntoView({ block: 'start', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
      playSwitch(panels[index]);
    }
  };

  const wire = () => {
    const list = nav.querySelector('[role="tablist"]');
    tabs = [...list.querySelectorAll('[role="tab"]')];
    panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
    tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i, { fromPointer: true })));
    list.addEventListener('keydown', (event) => {
      const current = tabs.indexOf(document.activeElement);
      if (current < 0) return;
      const keys = { ArrowRight: current + 1, ArrowDown: current + 1, ArrowLeft: current - 1, ArrowUp: current - 1, Home: 0, End: tabs.length - 1 };
      if (!(event.key in keys)) return;
      event.preventDefault();
      select((keys[event.key] + tabs.length) % tabs.length, { focus: true });
    });
  };

  render();
  vertical.addEventListener('change', () => {
    nav.querySelector('[role="tablist"]')?.setAttribute('aria-orientation', vertical.matches ? 'vertical' : 'horizontal');
  });
  window.addEventListener('lale:change', (e) => { if (e.detail === 'menu' || e.detail === '*') render(); });
})();

// Localul: fotografiile restaurantului, din js/venue-photos.js. Fără fotografii, ramele rămân goale și marcate.
(() => {
  const grid = document.querySelector('[data-venue]');
  const photos = Array.isArray(window.DEMO_VENUE_PHOTOS) ? window.DEMO_VENUE_PHOTOS.filter((p) => p && p.src) : [];
  if (!grid || !photos.length) return;
  grid.innerHTML = photos.map((p, i) => `
    <li class="frame${i === 0 ? ' frame--wide' : ''}">
      <figure>
        <img src="${escapeHtml(p.src)}" alt="${escapeHtml(p.alt || '')}"${p.width ? ` width="${Number(p.width)}"` : ''}${p.height ? ` height="${Number(p.height)}"` : ''} loading="lazy" decoding="async">
        ${p.caption || p.credit ? `<figcaption>${escapeHtml([p.caption, p.credit].filter(Boolean).join('. '))}</figcaption>` : ''}
      </figure>
    </li>`).join('');
})();

// Oferte: apar doar cele active și în perioada de valabilitate.
(() => {
  const section = document.getElementById('oferte');
  const list = document.querySelector('[data-offers]');
  if (!section || !list || !Store) return;
  const dateFormat = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long' });
  const fmt = (iso) => dateFormat.format(new Date(`${iso}T12:00:00`));
  const TONES = ['pomegranate', 'pistachio', 'saffron', 'sumac', 'ink'];

  const render = () => {
    const today = Store.today();
    const offers = Store.get('offers').filter((o) => o.active && (!o.from || o.from <= today) && (!o.to || o.to >= today));
    section.hidden = !offers.length;
    list.innerHTML = offers.map((o) => `
      <li class="offer offer--${TONES.includes(o.tone) ? o.tone : 'pomegranate'}">
        <h3 class="offer__title">${escapeHtml(o.title)}</h3>
        ${o.text ? `<p class="offer__text">${escapeHtml(o.text)}</p>` : ''}
        <p class="offer__meta">${o.price ? `<strong>${escapeHtml(o.price)}</strong>` : ''}${o.to ? `<span>Până pe ${fmt(o.to)}</span>` : ''}<span class="offer__tag">Ofertă demo</span></p>
      </li>`).join('');
  };

  render();
  window.addEventListener('lale:change', (e) => { if (e.detail === 'offers' || e.detail === '*') render(); });
})();

// Rezervare: validare inline, salvare în store, confirmare anunțată.
(() => {
  const form = document.querySelector('[data-booking]');
  if (!form || !Store) return;
  const fields = form.querySelector('[data-booking-fields]');
  const done = form.querySelector('[data-booking-done]');
  const summary = form.querySelector('[data-booking-summary]');
  const live = form.querySelector('[data-booking-live]');
  const date = form.elements.date;
  date.min = Store.today();
  date.value = Store.today();

  const rules = {
    name: (v) => v.trim().length >= 2,
    phone: (v) => v.replace(/[^\d]/g, '').length >= 9,
    date: (v) => Boolean(v) && v >= Store.today(),
    time: (v) => Boolean(v),
  };

  const check = (name) => {
    const input = form.elements[name];
    const ok = rules[name](input.value);
    const error = document.getElementById(`b-${name}-error`);
    input.setAttribute('aria-invalid', String(!ok));
    if (ok) input.removeAttribute('aria-describedby');
    else input.setAttribute('aria-describedby', error.id);
    error.hidden = ok;
    return ok;
  };

  Object.keys(rules).forEach((name) => {
    form.elements[name].addEventListener('blur', () => {
      if (form.elements[name].hasAttribute('aria-invalid')) check(name);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const invalid = Object.keys(rules).filter((name) => !check(name));
    if (invalid.length) {
      form.elements[invalid[0]].focus();
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    const reservation = {
      id: Store.uid('r'),
      name: data.name.trim(),
      phone: data.phone.trim(),
      date: data.date,
      time: data.time,
      people: Number(data.people),
      notes: (data.notes || '').trim(),
      status: 'pending',
      created: Date.now(),
    };
    Store.set('reservations', [reservation, ...Store.get('reservations')]);

    const when = new Intl.DateTimeFormat('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${data.date}T12:00:00`));
    const people = reservation.people === 9 ? '9 sau mai multe persoane' : `${reservation.people} ${reservation.people === 1 ? 'persoană' : 'persoane'}`;
    summary.textContent = `${reservation.name}, ${people}, ${when}, ora ${reservation.time}. Cererea apare acum în panoul de administrare demo, cu statusul „În așteptare”.`;
    fields.hidden = true;
    done.hidden = false;
    done.focus();
    live.textContent = 'Cererea de rezervare a fost trimisă.';
  });

  form.querySelector('[data-booking-again]').addEventListener('click', () => {
    form.reset();
    date.value = Store.today();
    form.querySelectorAll('[aria-invalid]').forEach((el) => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
    form.querySelectorAll('.field__error').forEach((el) => { el.hidden = true; });
    fields.hidden = false;
    done.hidden = true;
    live.textContent = '';
    form.elements.name.focus();
  });
})();

// Galeria: fiecare fotografie apare o singură dată, când intră în ecran (stilul e în styles.css, doar fără reduced motion).
(() => {
  const items = [...document.querySelectorAll('[data-reveal]')];
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  items.forEach((el) => io.observe(el));
})();
