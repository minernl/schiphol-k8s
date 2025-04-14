const express = require('express');
const { load } = require('js-yaml');
const { statSync, writeFileSync } = require('node:fs');
const { readFile, stat } = require('node:fs').promises;

const port = process.env.PORT ?? 8000;

const token = process.env.TOKEN ?? 'default';

const auth = `Bearer ${token}`;

let unhealthyTime = Number(process.env.UNHEALTHY_AFTER ?? 0);
let unhealthyWarning = true;

if (unhealthyTime) {
  console.log(`This pod will become unhealthy after ${unhealthyTime} seconds`);
  unhealthyTime = unhealthyTime * 1000 + Date.now();
}

let links;
let linksMtimeMs;

async function checkLinks() {
  const { mtimeMs } = await stat('./data/links.yaml');
  if (mtimeMs !== linksMtimeMs) {
    console.log('Read links.yaml');
    const yamlFile = await readFile('./data/links.yaml');
    links = load(yamlFile);
    linksMtimeMs = mtimeMs;
  }
  return links;
}

const app = express();

app.use(express.text());

app.all('/*', (req, res, next) => {
  if (!unhealthyTime || Date.now() < unhealthyTime) {
    // healthy
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

app.all('/*', (req, res, next) => {
  if (req.get('Authorization') !== auth) {
    res.sendStatus(401);
  } else {
    // authenticated
    next()
  }
});

app.get('/', (req, res) => {
  checkLinks()
    .then((links) => res.send(links))
    .catch(() => res.send({ name: 'Error while reading links.yaml', sections: [] }));
});

app.post('/', (req, res) => {
  console.log('Links received')
  yamlFile = req.body;
  links = load(yamlFile);
  res.send(links);

  console.log('Write links yaml')
  writeFileSync('./data/links.yaml', yamlFile);
  linksMtimeMs = statSync('./data/links.yaml').mtimeMs;
});

app.listen(port, () => {
  console.log(`Listening at port ${port}`);
});
