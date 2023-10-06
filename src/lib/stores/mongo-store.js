/* eslint-disable no-param-reassign */
import mongoose from 'mongoose';

class MongooseStore {
  mongoose;

  WebhookSubciptions;

  async initialize(mongooseConnect) {
    mongoose.connect(
      mongooseConnect,
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
        collection: 'report',
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

    this.WebhookSubciptions = mongoose.model(
      'webhookSubscriptions',
      webhookSubscriptionsSchema,
    );
    this.WebhookSubciptions.createIndexes({ id: 1 });
  }

  async getAll() {
    this.getByQuery();
  }

  async getById(webhookId) {
    const webhook = await this.WebhookSubciptions.find({ id: webhookId });
    if (!webhook) return null;
    return webhook;
  }

  async getByTag(tag) {
    const webhooks = this.WebhookSubciptions.find({ tags: tag });
    if (!webhooks.length) return [];
    return webhooks;
  }

  async getByEvents(events) {
    // Ensure that events is an array
    if (!Array.isArray(events)) events = [events];

    // Query the database for the matching webhooks
    const webhooks = await this.WebhookSubciptions.find({
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
    const webhooks = await this.WebhookSubciptions.find(query);
    if (!webhooks.length) return [];
    return webhooks;
  }

  async add(webhook) {
    const newHook = await this.WebhookSubciptions.create(webhook);
    await newHook.save();
    if (!newHook) throw new Error('Error adding object to mongo database');
    return newHook;
  }

  async remove(webhookId) {
    const deletedHook = await this.WebhookSubciptions.deleteOne({
      id: webhookId,
    });
    if (!deletedHook) { throw new Error(`Unable to find webhook with id ${webhookId}`); }
    return true;
  }
}

export default MongooseStore;
