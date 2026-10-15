// Beschikbaarheid: haalt één of meer iCal-feeds server-side op, voegt ze samen met de
// rechtstreekse boekingen uit direct-bookings.json en levert de bezette periodes als
// JSON op /api/availability.
//
// Daarnaast exporteert /ical/rechtstreeks.ics de rechtstreekse boekingen (enkel datums),
// zodat Airbnb (en andere kanalen) die data automatisch blokkeren.
//
// Zet je iCal-link(s) als omgevingsvariabele ICAL_FEEDS (komma-gescheiden voor
// meerdere kanalen, bv. Airbnb + Booking). NOOIT in de frontend zetten.
const fs = require('fs');
const path = require('path');
const ical = require('node-ical');
const { parseISO } = require('./dates');

const FEEDS = (process.env.ICAL_FEEDS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

const DIRECT_FILE = path.join(__dirname, 'direct-bookings.json');

const CACHE_MS = 30 * 60 * 1000; // 30 minuten
let cache = { data: null, ts: 0 };

// All-day-datums (dateOnly) staan op lokale middernacht: lees de lokale datum, niet UTC.
function toDay(d) {
  if (d.dateOnly) {
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }
  return new Date(d).toISOString().slice(0, 10);
}

// Rechtstreekse boekingen: [{ start, end }] met end = vertrekdag. Ongeldige regels worden overgeslagen.
function readDirectBookings(file = DIRECT_FILE) {
  let list;
  try {
    list = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('direct-bookings.json onleesbaar -', err.message);
    return [];
  }
  return (Array.isArray(list) ? list : [])
    .filter(b => b && parseISO(b.start) && parseISO(b.end) && b.end > b.start)
    .map(b => ({ start: b.start, end: b.end }));
}

async function getFeedBookings() {
  if (cache.data && Date.now() - cache.ts < CACHE_MS) return cache.data;

  const booked = [];
  for (const url of FEEDS) {
    try {
      const events = await ical.async.fromURL(url);
      for (const key in events) {
        const ev = events[key];
        if (ev.type === 'VEVENT' && ev.start && ev.end) {
          // In iCal is DTEND exclusief = de vertrekdag (checkout).
          booked.push({ start: toDay(ev.start), end: toDay(ev.end) });
        }
      }
    } catch (err) {
      console.error('iCal ophalen mislukt voor', url, '-', err.message);
      if (cache.data) return cache.data; // val terug op oude cache bij fout
    }
  }

  cache = { data: booked, ts: Date.now() };
  return cache.data;
}

const icsDate = s => s.replace(/-/g, '');

function directBookingsIcs(bookings, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//C-More//Rechtstreekse boekingen//NL', 'CALSCALE:GREGORIAN'];
  for (const b of bookings) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${b.start}_${b.end}@c-more-middelkerke`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(b.start)}`,
      `DTEND;VALUE=DATE:${icsDate(b.end)}`,
      'SUMMARY:Niet beschikbaar',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

module.exports = function registerAvailability(app, { directFile = DIRECT_FILE, feedBookings = getFeedBookings, synced = FEEDS.length > 0 } = {}) {
  app.get('/api/availability', async (req, res) => {
    try {
      const booked = [...await feedBookings(), ...readDirectBookings(directFile)];
      res.set('Cache-Control', 'public, max-age=900'); // 15 min browsercache
      res.json({ booked, synced, updated: new Date().toISOString() }); // synced: er is minstens één iCal-feed ingesteld
    } catch (e) {
      res.status(502).json({ error: 'Beschikbaarheid tijdelijk niet beschikbaar' });
    }
  });

  // Importeer deze link in Airbnb (en andere kanalen): (kalender synchroniseren → kalender importeren).
  app.get('/ical/rechtstreeks.ics', (req, res) => {
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Cache-Control', 'no-cache');
    res.send(directBookingsIcs(readDirectBookings(directFile)));
  });
};

module.exports.readDirectBookings = readDirectBookings;
module.exports.directBookingsIcs = directBookingsIcs;
