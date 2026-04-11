FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json ./
RUN npm install

COPY docker/entrypoint.sh /usr/local/bin/fitpilothq-entrypoint.sh
RUN chmod +x /usr/local/bin/fitpilothq-entrypoint.sh

CMD ["fitpilothq-entrypoint.sh"]
