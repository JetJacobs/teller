import crypto from 'crypto'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import { EventEmitter } from 'events'

import { buildHeaders } from '../request-signer.js'
import MemoryStorageProvider from './providers/memory-storage-provider.js'

class Teller {
	config
	db
	emitter
	buildHeaders

	constructor(_config = {}) {
		this.config = _config
		this.emitter = new EventEmitter()
		this.buildHeaders = this.config.buildHeaders || buildHeaders
		this.db = this.config.storageProvider || new MemoryStorageProvider()
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
		return this.db.getAll()
	}

	async getById(webhookId) {
		const webhook = await this.db.getById(webhookId)
		if (!webhook) return null
		return webhook
	}

	async getByTag(tag) {
		const webhooks = await this.db.getByTag(tag)
		if (!webhooks) return []
		return webhooks
	}

	async getByEvents(events) {
		const webhooks = await this.db.getByEvents(events)
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
		await this.db.add(objectToAdd)
		return this.db.getById(id)
	}

	async remove(webhookId) {
		await this.db.remove(webhookId)
		return true
	}

	async triggerByEvent(eventType, data, options = { tags: [], scopes: [] }) {
		const webhooks = await this.db.getByQuery(
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
			body: rawBody,
			headers: this.buildHeaders(
				config.company,
				url,
				rawBody,
				timestamp,
				webhookObject?.signatureToken
			),
			url: url,
		}

		return axios.request(options)
	}
}

export default Teller
