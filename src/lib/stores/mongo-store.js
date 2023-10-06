/* eslint-disable no-param-reassign */
import mongoose from 'mongoose';

class MongooseStore {
  mongoose;

  WebhookSubscriptions;

  async initialize(mongooseConnectionUri) {
    mongoose.connect(
      mongooseConnectionUri,
      { useNewUrlParser: true, useUnifiedTopology: true },
      (err) => {
        if (err) throw err;
      },
    );
    const urlSchema = mongoose.Schema(
      {
        base: { type: String, required: true },
        relativeUri: { type: String, required: true },
      },
      {
        _id: false,
        collection: 'urls',
        toObject: {
          transform(doc, ret) {
            delete ret._id;
            delete ret.__v;
          },
        },
        toJSON: {
          transform(doc, ret) {
            delete ret._id;
            delete ret.__v;
          },
        },
      },
    );
    const webhookSubscriptionsSchema = mongoose.Schema(
      {
        id: { type: String, required: true },
        url: { type: urlSchema, required: true },
        events: { type: [String], required: true },
        tags: { type: [String], required: true, default: [] },
        scopes: { type: [String], required: true, default: [] },
        signatureToken: { type: String, required: true },
        created: { type: Number },
        modified: { type: Number },
      },
      {
        collection: 'webhook-subscriptions',
        timestamps: true,
        toObject: {
          transform(doc, ret) {
            delete ret._id;
            delete ret.__v;
          },
        },
        toJSON: {
          transform(doc, ret) {
            delete ret._id;
            delete ret.__v;
          },
        },
      },
    );

    this.WebhookSubscriptions = mongoose.model(
      'webhookSubscriptions',
      webhookSubscriptionsSchema,
    );
    this.WebhookSubscriptions.createIndexes({ id: 1 });
  }

  async getAll() {
    this.getByQuery();
  }

  async getById(webhookId) {
    const webhook = await this.WebhookSubscriptions.find({ id: webhookId });
    if (!webhook) return null;
    return webhook;
  }

  async getByTag(tag) {
    const webhooks = this.WebhookSubscriptions.find({ tags: tag });
    if (!webhooks.length) return [];
    return webhooks;
  }

  async getByEvents(events) {
    // Ensure that events is an array
    if (!Array.isArray(events)) events = [events];

    // Query the database for the matching webhooks
    const webhooks = await this.WebhookSubscriptions.find({
      events: { $in: events },
    });
    // If no webhooks were found, return an empty array
    if (!webhooks.length) return [];
    // Otherwise, return the array of retrieved webhooks
    return webhooks;
  }

  async getByQuery({ events = [], tags = [], scopes = [] }) {
    const query = {
      ...(events.length > 0 && { events: { $in: events } }),
      ...(scopes.length > 0 && { scopes: { $in: scopes } }),
      ...(tags.length > 0 && { tags: { $all: tags } }),
    };
    const webhooks = await this.WebhookSubscriptions.find(query);
    if (!webhooks.length) return [];
    return webhooks;
  }

  async add(webhook) {
    return this.WebhookSubscriptions.create(webhook);
  }

  async remove(webhookId) {
    const result = await this.WebhookSubscriptions.deleteOne({ id: webhookId });
    if (result.deletedCount === 0) throw new Error(`Unable to find webhook with id ${webhookId}`);
    return true;
  }
}

export default MongooseStore;
