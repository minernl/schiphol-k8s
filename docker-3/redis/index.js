const express = require('express');
const { load } = require('js-yaml');
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { createClient } = require('redis');

const port = process.env.PORT ?? 3000;

const url = process.env.BACKEND ?? 'redis://redis-service:6379';

let client;

const connect = async () => {
  client = client ||  await createClient({ url })
    .on('error', (err) => console.log('Redis client error', err))
    .connect();
  return client;
}

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

app.get('/api/links', async(req, res) => {
  await connect();
  const yamlFile = await client.get('links');
  const links = yamlFile ? load(yamlFile) : { name: 'No links', sections: [] };
  res.send(links);
});

app.post('/api/yaml', async (req, res) => {
  const yamlFile = req.body;
  await connect();
  await client.set('links', yamlFile);
  const links = load(yamlFile);
  res.send(links);
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
