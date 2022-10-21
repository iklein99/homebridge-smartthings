FROM node:lts-alpine

RUN npm install -g homebridge \
    && mkdir -p /root/.homebridge

COPY config.json /root/.homebridge/config.json

CMD ["homebridge", "-D"]