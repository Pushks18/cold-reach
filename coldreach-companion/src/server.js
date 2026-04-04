const express = require('express');
const { version } = require('../package.json');

function createServer({ pipeline }) {
  const app = express();
  app.use(express.json());

  app.get('/status', (_req, res) => {
    res.json({ status: 'ok', version });
  });

  app.post('/scrape', async (req, res) => {
    const { urls = [], companies = [] } = req.body;
    if (!urls.length && !companies.length) {
      return res.status(400).json({ error: 'urls or companies required' });
    }
    try {
      const results = await pipeline.run({ urls, companies });
      res.json({ success: true, results });
    } catch (err) {
      console.error('[server] scrape error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}

module.exports = { createServer };
