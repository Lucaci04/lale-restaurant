# Lale Restaurant

![Prima pagină, desktop](docs/screenshots/acasa-desktop.jpg)

Site pentru un restaurant cu bucătărie turcească: meniu, rezervări și panou de administrare demo.

> Proiect demonstrativ. Firma, adresa, telefoanele, emailurile și recenziile sunt fictive. Orice asemănare cu o firmă reală este întâmplătoare.

## Capturi de ecran

| Prima pagină, telefon | Panou de administrare (demo) | Meniul |
|---|---|---|
| <img src="docs/screenshots/acasa-mobil.jpg" alt="Prima pagină, telefon" width="220"> | <img src="docs/screenshots/admin.jpg" alt="Panou de administrare (demo)" width="420"> | <img src="docs/screenshots/meniu.jpg" alt="Meniul" width="420"> |

## Tehnologii

HTML, CSS și JavaScript simplu, cu three.js pentru obiectul 3D.

## Decizii tehnice

- Un sahan de aramă, modelat în cod cu three.js, se mută între secțiuni pe măsură ce derulezi pagina.
- Meniul vine dintr-un fișier de date (`js/menu-data.js`) și poate fi editat din panoul demo `admin.html`.
- Rezervările și ofertele din demo se salvează în localStorage, deci nu ajung nicăieri.
- three.js e servit local, iar animația se oprește cu „prefers-reduced-motion”.
- Accesibilitate: link „Sari la conținut”, mesaje anunțate cititoarelor de ecran (aria-live), focus vizibil la navigarea cu tastatura.
- Animațiile se reduc sau se opresc pentru cine a setat „reducerea mișcării” în sistem (`prefers-reduced-motion`).
- Imaginile din afara ecranului se încarcă abia când e nevoie de ele (`loading="lazy"`).

## Rulare

Site static: deschide `index.html` în browser sau rulează un server local, de exemplu `npx serve .`.

## Cum a fost realizat

Proiectul a fost conceput și dezvoltat de Cristian Lucaci. În procesul de creație am folosit și instrumente de inteligență artificială, ca sprijin la scrierea codului, la texte și la verificări. Deciziile de design, alegerile tehnice și forma finală îmi aparțin.

## Licență

Codul este publicat sub licența [MIT](LICENSE), © 2026 Cristian Lucaci.

Resursele terțe incluse (fonturi, biblioteci, fotografii sau modele 3D cu licență liberă) își păstrează licențele proprii, menționate lângă fișiere sau în pagină. Imaginile fără sursă menționată sunt grafică generată pentru acest proiect.
