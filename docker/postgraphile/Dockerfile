FROM graphile/postgraphile:latest

RUN npm i @graphile/pg-pubsub

COPY ./apps/postgraphile-plugins/Requests.js /postgraphile/RequestsPlugin.js
