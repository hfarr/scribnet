FROM node:16.13.2 as base

RUN mkdir /app

WORKDIR /app
ADD ./package.json ./package-lock.json ./.eleventy.js ./
RUN npm install --production=false

FROM base AS static

WORKDIR /app

ADD ./views ./views/
ENV IGNORE_FILES true
RUN npm run build-static


FROM node:16.13.2-slim as prod

COPY --from=static /app/site /app/site
ADD ./scrivener /app/scrivener/

WORKDIR /app
ADD ./package.json ./package-lock.json ./
RUN mkdir data-folder
RUN npm install --production=true

ENTRYPOINT [ "npm", "run", "start" ]
