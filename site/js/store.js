// Stocare demo comună pentru site și admin. Totul rămâne în localStorage-ul acestui browser.
window.DemoStore = (() => {
  const PREFIX = 'lale-demo:';
  const clone = (value) => JSON.parse(JSON.stringify(value));

  const isoDay = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Date de exemplu, marcate ca demo. Nu sunt rezervări sau oferte reale.
  const seeds = {
    menu: () => clone(window.DEMO_MENU_DEFAULT || []),
    offers: () => [
      {
        id: 'o-demo-1',
        title: 'Exemplu: meze pentru doi',
        text: 'Ofertă demonstrativă. Conținutul, prețul și perioada reale se stabilesc cu restaurantul.',
        price: '',
        from: isoDay(0),
        to: isoDay(14),
        tone: 'pistachio',
        active: false,
      },
    ],
    reservations: () => [
      { id: 'r-demo-1', name: 'Ioana M.', phone: '+40 700 000 001', date: isoDay(0), time: '19:30', people: 4, notes: 'Masă lângă geam, dacă se poate.', status: 'pending', demo: true, created: Date.now() - 3600e3 },
      { id: 'r-demo-2', name: 'Andrei P.', phone: '+40 700 000 002', date: isoDay(0), time: '20:00', people: 2, notes: '', status: 'confirmed', demo: true, created: Date.now() - 7200e3 },
      { id: 'r-demo-3', name: 'Elif K.', phone: '+40 700 000 003', date: isoDay(1), time: '13:00', people: 6, notes: 'Aniversare.', status: 'pending', demo: true, created: Date.now() - 86400e3 },
      { id: 'r-demo-4', name: 'Radu S.', phone: '+40 700 000 004', date: isoDay(2), time: '18:45', people: 3, notes: '', status: 'cancelled', demo: true, created: Date.now() - 172800e3 },
    ],
  };

  const read = (key) => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* stocare indisponibilă: folosim valorile implicite */ }
    return seeds[key]();
  };

  const write = (key, value) => {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (_) { /* demo fără persistență */ }
    window.dispatchEvent(new CustomEvent('lale:change', { detail: key }));
  };

  // Sincronizare între taburi: admin deschis într-un tab, site în altul.
  window.addEventListener('storage', (event) => {
    if (event.key && event.key.startsWith(PREFIX)) {
      window.dispatchEvent(new CustomEvent('lale:change', { detail: event.key.slice(PREFIX.length) }));
    }
  });

  const priceFormat = new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return {
    get: read,
    set: write,
    reset() {
      Object.keys(seeds).forEach((key) => {
        try { localStorage.removeItem(PREFIX + key); } catch (_) { /* ignorat */ }
      });
      window.dispatchEvent(new CustomEvent('lale:change', { detail: '*' }));
    },
    uid: (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    formatPrice: (value) => `${priceFormat.format(value)} lei`,
    today: () => isoDay(0),
    isoDay,
  };
})();
