FROM node:14-alpine

WORKDIR /usr/webapp/server

COPY package.json .
COPY yarn.lock .

RUN yarn

COPY . .

RUN yarn build

EXPOSE 5000

CMD [ "node", "." ]
