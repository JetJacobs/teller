import express from 'express';
import bodyParser from 'body-parser';
import Teller from './lib/Teller.js';

const app = express();
const router = express.Router();

app.use(
  bodyParser.json({
    limit: '1mb',
    type: 'application/json',
    // eslint-disable-next-line no-unused-vars
    verify(req, res, buf, encoding) {
      req.rawBody = buf.toString();
    },
  }),
);

router.use((req, res, next) => {
  console.log(Date.now(), req.path, req.body);
  res.sendStatus(200);
});

app.use(router);

app.listen(3000, () => {
  console.log('App started and listening on', 3000);
  const teller = new Teller({ orgName: 'teller' });

  teller
    .add({
      url: { base: 'http://localhost:3000', relativeUri: '/' },
      events: ['test-event'],
      scopes: [],
      tags: [],
    })
    .then(()=> teller.tell('test-event', null, {scopes: ['test']}))
    .then(() => console.log('teller done'));
});
