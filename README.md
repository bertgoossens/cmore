# C-More — website + beschikbaarheidskalender

Website voor het vakantieappartement aan de Leopoldlaan 268, 8430 Middelkerke, met een
beschikbaarheidskalender die automatisch synchroniseert met de **Airbnb iCal-feed**. Eén Node/Express-server serveert de site én de API.

```
cmore/
├── server.js            # start de server
├── app.js               # Express-app: site + API's
├── availability.js      # leest de iCal-feed(s) server-side, met caching (30 min)
├── dates.js             # datumcontrole
├── direct-bookings.json # boekingen die je zelf afspreekt
├── .env.example
├── tests/
├── brand/              # logo (origineel)
└── public/
    ├── index.html       # de volledige website
    ├── site.js          # menu, galerij, kalender, contactformulier
    ├── images/          # foto's en logo
    └── fonts/           # Fraunces en Inter, lokaal gehost
```

Teksten: aangeleverd door Joke (mail van 6 oktober 2026).

## Lokaal draaien

Vereist Node 18 of hoger.

```bash
npm install
cp .env.example .env      # en vul de waarden in
npm start
```

Open daarna http://localhost:3000

## Omgevingsvariabelen

| Variabele        | Waarvoor                                                                   |
|------------------|----------------------------------------------------------------------------|
| `ICAL_FEEDS`     | iCal-link(s) van Airbnb (en eventueel Booking), komma-gescheiden           |

Zonder `ICAL_FEEDS` werkt de kalender nog, maar toont ze enkel `direct-bookings.json`.

## De Airbnb iCal-link vinden

Airbnb → **Agenda** → kies het appartement → **Beschikbaarheid** → **Agenda's koppelen** →
**Agenda exporteren** → kopieer de link. Deel die link niet publiek: daarom staat hij enkel
server-side en nooit in de frontend.

## Contactformulier

Het formulier onderaan de site heeft geen server nodig: het stelt een `mailto:`-link samen en
opent het e-mailprogramma van de bezoeker met een ingevuld bericht aan
`joke_wouters@hotmail.com` (instelbaar via `MAIL_TO` in `public/site.js`).

## Rechtstreekse boekingen

Boekingen die je zelf afspreekt zet je in `direct-bookings.json` (vertrekdag = `end`):

```json
[
  { "start": "2027-08-20", "end": "2027-08-22" }
]
```

Ze verschijnen als bezet op de site én in de export `/ical/rechtstreeks.ics`. Importeer die
link één keer in Airbnb (**Agenda's koppelen → Agenda importeren**), dan worden die data daar
automatisch geblokkeerd. Zet geen namen in dit bestand.

## Hoe de kalender werkt

- De kalender toont per dag **vrij** of **bezet**.
- In iCal is de einddatum de **vertrekdag**: die dag staat dus als vrij (de volgende gast kan
  dan aankomen).
- Airbnb ververst de feed om de paar uur; de server cachet 30 minuten.

## Tests

```bash
npm test
```

## Deployen op Render

1. Push deze map naar een Git-repo.
2. Maak op Render een **Web Service** aan: build `npm install`, start `npm start`.
3. Zet `ICAL_FEEDS` onder **Environment**.
