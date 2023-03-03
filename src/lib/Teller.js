import crypto from 'crypto'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import { EventEmitter } from 'events'

import { buildHeaders } from './utils/request-signer.js'
import { MemoryStore } from './stores/memory-store.js'

class Teller {
	orgName
	store
	emitter
	buildHeaders

	constructor(options = {}) {
		this.orgName = options.orgName || 'teller'
		this.emitter = new EventEmitter()
		this.buildHeaders = options.buildHeaders || buildHeaders
		this.store = options.storageProvider || new MemoryStore()
		axiosRetry(axios, {
			retries: 15,
			retryDelay: axiosRetry.exponentialDelay,
			shouldResetTimeout: true,
			retryCondition: (_error) => true,
		})
	}

	on(str, cb) {
		return this.emitter.on(str, cb)
	}

	async getAll() {
		return this.store.getAll()
	}

	async getById(webhookId) {
		const webhook = await this.store.getById(webhookId)
		if (!webhook) return null
		return webhook
	}

	async getByTag(tag) {
		const webhooks = await this.store.getByTag(tag)
		if (!webhooks) return []
		return webhooks
	}

	async getByEvents(events) {
		const webhooks = await this.store.getByEvents(events)
		if (!webhooks) return []
		return webhooks
	}

	async add(webhookObject) {
		if (!webhookObject?.url?.base || !webhookObject?.url?.relativeUri)
			throw new Error(
				'Missing or malformed url parameter on webhook object'
			)
		if (!webhookObject.events || !Array.isArray(webhookObject.events))
			throw new Error('Missing events parameter or is not an array')
		if (!webhookObject.events.length)
			throw new Error('events parameter requires at least one event')

		const id = crypto.randomUUID()
		const createdDate = new Date()
		const objectToAdd = {
			id: id,
			tags: webhookObject?.tags || [],
			meta: webhookObject?.meta || {},
			url: webhookObject?.url,
			events: webhookObject?.events,
			scopes: webhookObject?.scopes,
			signatureToken: this._generateAuthToken(),
			created: createdDate.toJSON(),
			modified: createdDate.toJSON(),
		}
		await this.store.add(objectToAdd)
		return this.store.getById(id)
	}

	async remove(webhookId) {
		await this.store.remove(webhookId)
		return true
	}

	async tell(eventType = '', data = {}, options = { tags: [], scopes: [] }) {
		const webhooks = await this.store.getByQuery(
			[eventType],
			options?.tags,
			options?.scopes
		)

		if (!webhooks) return null

		const numberOfHooks = webhooks.length
		const responsePromises = []
		for (let i = 0; i < numberOfHooks; i++) {
			const hook = webhooks[i]
			try {
				const res = await this._httpPost(hook, eventType, data)
				this.emitter.emit('response', {
					webhookId: hook.id,
					type: 'HTTP_SEND_RESPONSE',
					msg: `Received response from server for webhook with ID: ${hook.id}`,
					response: res,
				})
				responsePromises.push(res)
			} catch (err) {
				this.emitter.emit('error', {
					webhookId: hook.id,
					type: 'HTTP_SEND_ERROR',
					msg: `Error triggering webhook with ID: ${hook.id}`,
					error: err,
				})
				responsePromises.push(err)
			}
		}
		const responses = await Promise.all(responsePromises)
		return {
			msg: `Triggered ${webhooks.length} webhook(s)`,
			webhookIds: webhooks.map((e) => e.id),
			responses: responses,
		}
	}

	_generateAuthToken() {
		const randomVal = crypto.randomUUID()
		return crypto.createHash('sha1').update(randomVal).digest('hex')
	}

	async _httpPost(webhookObject, eventType, data) {
		const url = webhookObject?.url?.base + webhookObject?.url?.relativeUri
		const jsonBody = {
			event: eventType,
			webhookId: webhookObject.id,
			data: data,
		}
		const rawBody = JSON.stringify(jsonBody)
		const options = {
			method: 'POST',
			url: url,
			headers: this.buildHeaders(
				this.orgName,
				url,
				rawBody,
				timestamp,
				webhookObject?.signatureToken
			),
			body: rawBody,
		}

		return axios.request(options)
	}
}

export default Teller
