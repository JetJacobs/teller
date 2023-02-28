class MemoryStorageProvider {
	constructor() {}

	async getAll() {
		return this.db
	}

	async getById(webhookId) {
		const webhook = this.db.find((e) => e.id === webhookId)
		if (!webhook) return null
		return webhook
	}

	async getByTag(tag) {
		const webhooks = this.db.filter((e) => e.tags.includes(tag))
		if (!webhooks.length) return []
		return webhooks
	}

	async getByEvent(eventType) {
		const webhooks = this.db.filter((e) => e.events.includes(eventType))
		if (!webhooks.length) return []
		return webhooks
	}

	async getByEvents(events) {
		if (typeof events === 'string') events = [events]
		this.db.filter((hook) => {
			return hook.events.some((event) => events.includes(event))
		})
		if (!webhooks.length) return []
		return webhooks
	}

	async getByQuery(events = [], tags = [], scopes = []) {
		const webhooks = this.db.filter((hook) => {
			const eventMatch = hook.events.some((event) =>
				events.includes(event)
			)
			const scopeMatch = hook.scopes.some((scope) =>
				scopes.includes(scope)
			)
			const tagMatch = hook.scopes.all((scope) => tags.includes(scope))
			return eventMatch && tagMatch && scopeMatch
		})
		if (!webhooks.length) return []
		return webhooks
	}

	async add(webhook) {
		this.db.push(webhook)
		const result = this.db.find((e) => e.id === webhook.id)
		if (!result)
			throw new Error('Error adding object to in-memory database')
		return result
	}

	async remove(webhookId) {
		const result = this.db.findIndex((e) => e.id === webhookId)
		if (result === -1)
			throw new Error(`Unable to find webhook with id ${webhookId}`)
		this.db.splice(result, 1)
		return true
	}
}

export default MemoryStorageProvider
