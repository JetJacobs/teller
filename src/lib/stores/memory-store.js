/* eslint-disable no-param-reassign */
class MemoryStorageProvider {
  db

  constructor() {
    this.db = [];
  }

  async getAll() {
    return this.db;
  }

  async getById(webhookId) {
    const webhook = this.db.find((e) => e.id === webhookId);
    if (!webhook) return null;
    return webhook;
  }

  async getByTag(tag) {
    const webhooks = this.db.filter((e) => e.tags.includes(tag));
    if (!webhooks.length) return [];
    return webhooks;
  }

  async getByEvents(events) {
    if (typeof events === 'string') events = [events];
    const webhooks = this.db.filter((hook) => hook.events.some((event) => events.includes(event)));
    if (!webhooks.length) return [];
    return webhooks;
  }

  async getByQuery(events = [], tags = [], scopes = []) {
    console.log(this.db)
    const webhooks = this.db.filter((hook) => {
      const eventMatch = hook.events.some((event) => events.includes(event));
      const scopeMatch = hook.scopes.some((scope) => scopes.includes(scope)) || scopes.length === 0;
      const tagMatch = hook.tags.every((tag) => tags.includes(tag));
      console.log(eventMatch, scopeMatch, tagMatch)
      return eventMatch && tagMatch && scopeMatch;
    });
    if (!webhooks.length) return [];
    return webhooks;
  }

  async add(webhook) {
    this.db.push(webhook);
    const result = this.db.find((e) => e.id === webhook.id);
    if (!result) { throw new Error('Error adding object to in-memory database'); }
    return result;
  }

  async remove(webhookId) {
    const result = this.db.findIndex((e) => e.id === webhookId);
    if (result === -1) { throw new Error(`Unable to find webhook with id ${webhookId}`); }
    this.db.splice(result, 1);
    return true;
  }
}

export default MemoryStorageProvider;
