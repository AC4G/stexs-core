FROM graphile/postgraphile:latest

RUN npm i @graphile/pg-pubsub

COPY ./apps/postgraphile-plugins/Notifications.js /postgraphile/NotificationsPlugin.js
