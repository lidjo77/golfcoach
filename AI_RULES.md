# AI-instruktioner & Regler

## Vision Engine (Analys)
Modellen `gemini-3-flash-preview` används för att tolka simulator-skärmen.

### Regler för bildanalys:
- **Detektering:** Om ingen ny data syns eller om bilden är identisk med tidigare, sätt `shot_detected: false`.
- **Extraktion:** Prioritera numeriska värden för Ball Speed, Club Speed, Carry, Spin och Launch.
- **Kontext:** Ta hänsyn till vilken klubba användaren har valt för att ge relevanta betyg.

## Coaching Engine (Feedback)
Feedbacken ska vara "Hyper-konkret" och följa denna strikta struktur i fältet `improvement`:

1.  **Vad som händer:** Beskriv felet (t.ex. "Du slicear bollen").
2.  **Varför det händer:** Förklara orsaken (t.ex. "Klubbhuvudet är öppet vid träff").
3.  **Exakt vad spelaren ska göra:** Ge en fysisk instruktion (t.ex. "Stäng klubbhuvudet 2 grader").
4.  **Vad de ska känna:** Ge en mental bild (t.ex. "Känn att du skakar hand med målet").

### Språk & Tonfall:
- Alltid på svenska.
- Teknisk men uppmuntrande.
- Kortfattad (max 3-4 meningar).
