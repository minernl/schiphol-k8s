FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY app ./

RUN npm install

RUN npm run build


FROM node:22-alpine

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install

COPY --from=builder /usr/src/app/dist ./dist/

COPY index.js ./

EXPOSE 3000

CMD [ "node", "index.js" ]
