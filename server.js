// C-More — start de Express-server: de site + de API's.
const { createApp } = require('./app');

const app = createApp();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`C-More draait op http://localhost:${PORT}`);
  if (!process.env.ICAL_FEEDS) {
    console.warn('⚠  ICAL_FEEDS is niet ingesteld — de kalender toont enkel de rechtstreekse boekingen. ' +
      'Zet ICAL_FEEDS met je Airbnb iCal-link (zie README).');
  }
});
