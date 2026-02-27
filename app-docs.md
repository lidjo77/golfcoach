# AI Golf Simulator Vision Prototype - Dokumentation

## Övergripande beskrivning
Denna applikation är en vision-baserad prototyp designad för att automatiskt läsa av och analysera data från en golfsimulator (t.ex. TrackMan, GCQuad eller FlightScope) med hjälp av en mobilkamera och Google Gemini AI.

## Huvudfunktioner

### 1. Vision Engine (AI-analys)
*   **Automatisk avläsning:** Appen använder kameran för att kontinuerligt övervaka simulatorns skärm.
*   **Smart Change Detection:** För att spara på API-krediter skickas bilder till AI:n endast när en betydande förändring upptäcks på skärmen (t.ex. efter ett nytt slag).
*   **Gemini 3 Flash:** Använder Googles senaste vision-modell för att extrahera siffror som bollhastighet, carry, spin rate och launch angle.

### 2. AI Coach & Feedback
*   **Omedelbar analys:** Varje slag får ett betyg (1-10) och en teknisk analys.
*   **Hyper-konkreta tips:** AI:n ger inte bara data, utan konkreta instruktioner som följer strukturen:
    1. Vad som händer (t.ex. "Du slår troligen lite ner på bollen")
    2. Varför det händer (t.ex. "Bollen ligger för långt bak")
    3. Exakt vad spelaren ska göra (t.ex. "Flytta bollen 1–2 cm längre fram i stansen")
    4. Vad de ska känna (t.ex. "Känn att du slår upp genom bollen")
*   **Fråga Coachen (Chatt):** En interaktiv chatt där du kan ställa frågor om din teknik. Coachen har koll på din senaste historik och vilken klubba du använder.
*   **Röstfeedback:** Appen kan läsa upp dina resultat högt så att du slipper gå fram till telefonen mellan slagen.

### 3. Träningsverktyg
*   **Sessionshantering:** Organisera dina slag i olika sessioner (t.ex. "Driver-pass" eller "Järn-träning").
*   **Klubbval:** Välj vilken klubba du använder för att få mer pricksäker AI-analys.
*   **Trender & Grafer:** Visualisera din utveckling över tid med interaktiva diagram för bollhastighet och carry.

## Säkerhet & Kontroll
*   **PIN-kod:** Appen är skyddad med en PIN-kod (standard: `1234`) för att skydda din data och dina API-krediter.
*   **Master Switch:** Du startar och stoppar monitoring manuellt med en tydlig knapp.
*   **Inactivity Timeout:** Monitoring stängs automatiskt av efter 15 minuters inaktivitet för att förhindra onödig förbrukning av krediter.
*   **API Key Selection:** Stöd för att ansluta en egen betald API-nyckel om gratis-krediterna tar slut.

## Teknisk Stack
*   **Frontend:** React 19, Tailwind CSS 4, Lucide Icons, Recharts, Motion.
*   **Backend:** Node.js (Express), SQLite (Better-SQLite3).
*   **AI:** Google Generative AI SDK (@google/genai).

## Installation & Uppstart
1.  Öppna appen i en webbläsare (helst på mobilen).
2.  Ange PIN-kod `1234`.
3.  Montera telefonen på ett stativ så att simulatorns skärm syns tydligt i ramen.
4.  Välj klubba och klicka på **"START MONITORING"**.
5.  Börja slå! Appen sköter resten.
