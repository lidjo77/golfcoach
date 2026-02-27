# Säkerhet & API-kontroll

## Åtkomstskydd
- **PIN-kod:** Appen kräver en 4-siffrig PIN-kod (`1234`) för att låsa upp gränssnittet. Detta förhindrar obehörig användning av API-krediter vid publik deployment.

## API-nyckelhantering
- **Free Tier:** Använder `GEMINI_API_KEY` från miljövariabler.
- **Pay-as-you-go:** Stödjer dynamiskt val av API-nyckel via AI Studio-dialogen om gratis-krediterna tar slut.
- **Quota Management:** Appen fångar upp "429 Resource Exhausted" och informerar användaren om att byta nyckel.

## Driftkontroll
- **Master Switch:** Monitoring är alltid AV som standard.
- **Inactivity Timeout:** Systemet stänger automatiskt av kameran och API-anrop efter 15 minuter utan användarinteraktion.
- **Local Processing:** Change detection sker lokalt i webbläsaren för att minimera onödiga API-anrop.

## Data
- **SQLite:** All data sparas lokalt i en SQLite-fil på servern. Ingen data delas med tredje part förutom bilddata till Google Gemini för analys.
