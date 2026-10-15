const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readDirectBookings, directBookingsIcs } = require('../availability');
const { createApp } = require('../app');

function tmpFile(content) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rp-')), 'direct.json');
  fs.writeFileSync(f, content);
  return f;
}

async function withServer(app, fn) {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { server.close(); }
}

test('rechtstreekse boekingen: ongeldige regels worden overgeslagen', () => {
  const f = tmpFile(JSON.stringify([
    { start: '2027-08-20', end: '2027-08-22' },
    { start: '2027-08-25', end: '2027-08-24' },
    { start: 'morgen', end: '2027-08-24' },
  ]));
  assert.deepEqual(readDirectBookings(f), [{ start: '2027-08-20', end: '2027-08-22' }]);
  assert.deepEqual(readDirectBookings('/bestaat/niet.json'), []);
});

test('iCal-export bevat de rechtstreekse boekingen als hele dagen', () => {
  const ics = directBookingsIcs([{ start: '2027-08-20', end: '2027-08-22' }], new Date('2026-10-07T10:00:00Z'));
  assert.match(ics, /DTSTART;VALUE=DATE:20270820\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20270822\r\n/);
  assert.match(ics, /^BEGIN:VCALENDAR\r\n[\s\S]*END:VCALENDAR\r\n$/);
});

test('/api/availability voegt feeds en rechtstreekse boekingen samen', async () => {
  const f = tmpFile(JSON.stringify([{ start: '2027-08-20', end: '2027-08-22' }]));
  const app = createApp({ availability: { directFile: f, feedBookings: async () => [{ start: '2026-10-09', end: '2026-10-11' }] } });
  await withServer(app, async base => {
    const data = await (await fetch(base + '/api/availability')).json();
    assert.deepEqual(data.booked, [{ start: '2026-10-09', end: '2026-10-11' }, { start: '2027-08-20', end: '2027-08-22' }]);
    const ics = await fetch(base + '/ical/rechtstreeks.ics');
    assert.match(ics.headers.get('content-type'), /text\/calendar/);
  });
});
