import Teller from './lib/Teller';

const teller = new Teller({ orgName: 'teller' });

teller.add({
  url: { base: 'localhost:80', relativeUri: '/test' }, events: ['add-hook'], tags: ['test'], scopes: ['brand'],
});
