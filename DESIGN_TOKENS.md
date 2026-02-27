# Design Tokens & UI-principer

## Färgpalett
- **Bakgrund:** `Zinc-950` (Svart/Mörkgrå)
- **Ytor:** `Glass` (Vit med 5-10% opacitet + Backdrop Blur)
- **Primär (Success):** `Emerald-500` (Används för positiva värden, "Start"-knapp)
- **Sekundär (Warning):** `Amber-500` (Används för AI-tips, Quota-varningar)
- **Accent (Danger):** `Red-600` (Används för "Stop"-knapp, LIVE-indikator)
- **Text:** `White` (Primary), `Zinc-400` (Secondary/Muted)

## Typografi
- **Sans:** `Inter` (Används för all UI-text)
- **Mono:** `JetBrains Mono` (Används för numerisk data och mätvärden)
- **Headings:** `Font-black`, `Tracking-tighter`, `Uppercase`

## Komponenter
- **Cards:** Rundade hörn (`rounded-3xl`), subtil border (`border-white/5`).
- **Buttons:** Stora touch-ytor, tydliga hover-effekter, `uppercase tracking-widest`.
- **Animations:** Mjuka övergångar med `AnimatePresence` och `motion`.

## Layout
- **Desktop:** Två-kolumns layout (Kamera vänster, Analys höger).
- **Mobile:** Stackad layout (Kamera överst, Analys under).
