const express = require('express');
const { load } = require('js-yaml');
const { existsSync, statSync, writeFileSync } = require('node:fs');
const { readFile, stat } = require('node:fs').promises;

const { join } = require('node:path');

const port = process.env.PORT || 3000;

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
    next();
  } else if (unhealthyWarning) {
    console.warn('Pod has now (intentionally) become unresponsive');
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
  checkLinks()
    .then((links) => res.send(links))
    .catch(() => res.send({ name: 'Error while reading links.yaml', sections: [] }));
});

app.post('/api/yaml', (req, res) => {
  console.log('Links received')
  yamlFile = req.body;
  links = load(yamlFile);
  res.send(links);

  console.log('Write links yaml')
  writeFileSync('./data/links.yaml', yamlFile);
  linksMtimeMs = statSync('./data/links.yaml').mtimeMs;
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
