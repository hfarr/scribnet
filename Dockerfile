FROM node:16.13.2 as base

RUN mkdir /app

WORKDIR /app
ADD ./package.json ./package-lock.json ./.eleventy.js ./
RUN npm install

FROM base AS static

WORKDIR /app

RUN mkdir data-folder
ADD ./views ./views/
ADD ./scrivener ./scrivener/

RUN npm run build-static

FROM node:16.13.2-slim as prod

COPY --from=static /app /app
WORKDIR /app

ENTRYPOINT [ "npm", "run", "start" ]
