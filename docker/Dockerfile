FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY app ./

RUN npm install

RUN npm run build


FROM node:22-alpine

WORKDIR /usr/src/app

COPY api/package.json ./

RUN npm install

COPY --from=builder /usr/src/app/dist ./dist/

COPY api/index.js ./

COPY api/links.yaml ./data/

EXPOSE 3000

CMD [ "node", "index.js" ]
