// C-More — de Express-app (zonder listen), zodat tests ze kunnen opbouwen.
const path = require('path');
const express = require('express');
const registerAvailability = require('./availability');

function createApp({ availability = {} } = {}) {
  const app = express();
  app.set('trust proxy', 1); // Render zit achter een proxy: nodig voor req.ip

  // Beschikbaarheid (/api/availability) en export van rechtstreekse boekingen (/ical/rechtstreeks.ics).
  registerAvailability(app, availability);

  // Statische site (public/).
  app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

  // Fallback naar de homepage — maar niet voor bestanden (.jpg, .css, ...) of de API.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || path.extname(req.path)) return next();
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  return app;
}

module.exports = { createApp };
