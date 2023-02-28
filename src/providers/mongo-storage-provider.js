import mongoose from 'mongoose'

class MongooseStorageProvider {
	mongoose
	WebhookSubciptions

	constructor() {}

	async initialize(mongooseConnect) {
		mongoose.connect(
			mongooseConnect,
			{ useNewUrlParser: true, useUnifiedTopology: true },
			function (err) {
				if (err) throw err
			}
		)
		const urlSchema = Mongoose.Schema(
			{
				base: { type: String, required: true },
				relativeUri: { type: String, required: true },
			},
			{
				_id: false,
				collection: 'report',
				toObject: {
					transform: function (doc, ret) {
						delete ret._id
						delete ret.__v
					},
				},
				toJSON: {
					transform: function (doc, ret) {
						delete ret._id
						delete ret.__v
					},
				},
			}
		)
		const webhookSubscriptionsSchema = mongoose.Schema(
			{
				id: { type: String, required: true },
				url: { type: urlSchema, required: true },
				events: { type: [String], required: true },
				tags: { type: [String], required: true, default: [] },
				scopes: { type: [String], required: true, default: [] },
				signatureToken: { type: String, required: true },
				created: { type: String },
				modified: { type: String },
			},
			{
				collection: 'webhook-subscriptions',
				toObject: {
					transform: function (doc, ret) {
						delete ret._id
						delete ret.__v
					},
				},
				toJSON: {
					transform: function (doc, ret) {
						delete ret._id
						delete ret.__v
					},
				},
			}
		)

		this.WebhookSubciptions = mongoose.model(
			'webhookSubscriptions',
			webhookSubscriptionsSchema
		)
		this.WebhookSubciptions.createIndexes({ id: 1 })
	}

	async getAll() {
		return await this.WebhookSubciptions.find({})
	}

	async getById(webhookId) {
		const webhook = await this.WebhookSubciptions.find({ id: webhookId })
		if (!webhook) return null
		return webhook
	}

	async getByTag(tag) {
		const webhooks = this.WebhookSubciptions.find({ tags: tag })
		if (!webhooks.length) return []
		return webhooks
	}

	async getByEvent(eventType) {
		const webhooks = this.WebhookSubciptions.find({ events: eventType })
		if (!webhooks.length) return []
		return webhooks
	}

	async getByEvents(events) {
		const webhooks = this.WebhookSubciptions.find({
			events: { $in: events },
		})
		if (!webhooks.length) return []
		return webhooks
	}

	async getByQuery(events = [], tags = [], scopes = []) {
		const webhooks = this.WebhookSubciptions.find({
			events: { $in: events },
			scopes: { $in: scopes },
			tags: { $all: tags },
		})
		if (!webhooks.length) return []
		return webhooks
	}

	async add(webhook) {
		const newHook = await this.WebhookSubciptions.create(webhook)
		await newHook.save()
		if (!newHook) throw new Error('Error adding object to mongo database')
		return newHook
	}

	async remove(webhookId) {
		const deletedHook = await this.WebhookSubciptions.deleteOne({
			id: webhookId,
		})
		if (!deletedHook)
			throw new Error(`Unable to find webhook with id ${webhookId}`)
		return true
	}
}

export default MongooseStorageProvider
