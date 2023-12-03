FROM graphile/postgraphile:latest

RUN npm i @graphile/pg-pubsub

COPY ./docker/postgraphile/plugins/CustomPlugin.js /postgraphile/
