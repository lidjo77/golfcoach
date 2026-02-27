# AI Golf Vision 🏌️‍♂️🤖

En vision-baserad golfassistent som analyserar din simulator-data i realtid med hjälp av Google Gemini AI.

## Snabbstart
1.  **Starta:** Öppna appen och ange PIN-kod `1234`.
2.  **Setup:** Rikta kameran mot din golfsimulators skärm. Använd kalibreringsguiden för att centrera datan.
3.  **Välj klubba:** Välj den klubba du tränar med i menyn.
4.  **Träna:** Klicka på **"START MONITORING"**. Appen detekterar nu automatiskt nya slag och ger dig feedback via röst och skärm.

## Huvudfunktioner
- **AI Vision:** Extraherar automatiskt bollhastighet, carry, spin och launch angle.
- **Hyper-konkret coaching:** Få tips som en riktig tränare (Vad, Varför, Gör, Känn).
- **Röstfeedback:** Resultaten läses upp högt (valbart).
- **Sessionshantering:** Spara och jämför olika träningspass.
- **AI Coach Chatt:** Ställ frågor om din teknik direkt till en AI-expert.

## Installation
```bash
npm install
npm run dev
```

## Dokumentation
- [Arkitektur](ARCHITECTURE.md)
- [AI Regler](AI_RULES.md)
- [Säkerhet](SECURITY.md)
- [Användarflöden](USER_FLOWS.md)
- [Design Tokens](DESIGN_TOKENS.md)
