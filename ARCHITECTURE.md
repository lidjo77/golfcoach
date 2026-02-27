# Systemarkitektur - AI Golf Vision

## Översikt
Applikationen är byggd som en full-stack webbapplikation med realtidsbearbetning av bilddata.

## Teknisk Stack
- **Frontend:** React 19 (Vite)
- **Styling:** Tailwind CSS 4
- **Animationer:** Motion (Framer Motion)
- **Grafer:** Recharts
- **Backend:** Node.js (Express)
- **Databas:** SQLite (Better-SQLite3)
- **AI:** Google Gemini 3 Flash (Vision & Text)

## Dataflöde
1.  **Capture:** Webkamera fångar frames via `getUserMedia`.
2.  **Change Detection:** En lokal algoritm jämför pixlar mellan frames för att se om skärmen uppdaterats.
3.  **AI Analysis:** Vid förändring skickas en Base64-bild till Gemini API.
4.  **Storage:** Resultatet sparas i SQLite och skickas till frontend.
5.  **Feedback:** UI uppdateras och röstsyntes (Web Speech API) läser upp tips.

## Databasmodell
### Table: `sessions`
- `id`: Primary Key
- `name`: Sessionsnamn
- `timestamp`: Skapad tid

### Table: `shots`
- `id`: Primary Key
- `session_id`: Foreign Key
- `club`: Använd klubba
- `ball_speed`, `carry_distance`, etc: Mätvärden
- `analysis`, `improvement`: AI-genererad text
- `rating`: Betyg (1-10)
