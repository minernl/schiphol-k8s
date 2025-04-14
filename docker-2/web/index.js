const axios = require('axios');
const express = require('express');
const { existsSync } = require('node:fs');
const { join } = require('node:path');

const port = process.env.PORT ?? 3000;

const backend = process.env.BACKEND ?? 'http://startpagina-store:8000';

const token = process.env.TOKEN ?? 'default';
const getHeaders = { 'Authorization': `Bearer ${token}` };
const postHeaders = { ...getHeaders, 'Content-Type': 'text/plain' };

let unhealthyTime = Number(process.env.UNHEALTHY_AFTER ?? 0);
let unhealthyWarning = true;

if (unhealthyTime) {
  console.log(`This pod will become unhealthy after ${unhealthyTime} seconds`);
  unhealthyTime = unhealthyTime * 1000 + Date.now();
}

const app = express();

app.use(express.text());

app.all('/*', (req, res, next) => {
  if (!unhealthyTime || Date.now() < unhealthyTime) {
    next();
  } else if (unhealthyWarning) {
    console.warn('This pod has now (intentionally) become unresponsive');
    unhealthyWarning = false;
  }
})

app.get('/healthz', (req, res) => {
  res.sendStatus(200);
});

app.get('/readyz', (req, res) => {
  res.sendStatus(200);
});

app.get('/api/links', (req, res) => {
  axios.get(backend, { headers: getHeaders })
    .then((result) => res.send(result.data))
    .catch((error) => {
      console.log(error);
      res.sendStatus(500)
    });
});

app.post('/api/yaml', (req, res) => {
  axios.post(backend, req.body, { headers: postHeaders })
    .then((result) => res.send(result.data))
    .catch(() => res.sendStatus(500))
});

const staticPath = join(__dirname, 'dist');
if (existsSync(staticPath)) {
  app.use('/', express.static(staticPath));

  app.get('/upload', (req, res) => {
    res.sendFile(join(staticPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Listening at port ${port}`);
});
