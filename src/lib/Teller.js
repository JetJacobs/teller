import crypto from 'crypto';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { EventEmitter } from 'events';

import MemoryStore from './stores/memory-store.js';
import { buildHeaders } from './utils/request-signer.js';

/**
 * Generates an authentication token
 * @returns {string} - Authentication token
 */
function generateAuthToken() {
  const randomVal = crypto.randomUUID();
  return crypto.createHash('sha1').update(randomVal).digest('hex');
}

/**
 * Teller class for managing and triggering webhooks
 */
class Teller {
  orgName;

  store;

  emitter;

  buildHeaders;

  /**
   * Constructor for Teller class
   * @param {Object} options - Options object for Teller instance
   * @param {string} options.orgName - Organization name
   * @param {function} options.buildHeaders - Function for building headers for request signing
   * @param {object} options.storageProvider - Storage provider for storing and retrieving webhooks
   */
  constructor(options = {}) {
    this.orgName = options.orgName || 'teller';
    this.emitter = new EventEmitter();
    this.buildHeaders = options.buildHeaders || buildHeaders;
    this.store = options.storageProvider || new MemoryStore();
    axiosRetry(axios, {
      retries: 15,
      retryDelay: axiosRetry.exponentialDelay,
      shouldResetTimeout: true,
      retryCondition: () => true,
    });
  }

  /**
   * Adds a listener for an event
   * @param {string} str - Event string
   * @param {function} cb - Callback function
   * @returns {Object} - The Teller instance
   */
  on(str, cb) {
    return this.emitter.on(str, cb);
  }

  /**
   * Gets all webhooks
   * @returns {Promise} - Promise that resolves with an array of all webhooks
   */
  async getAll() {
    return this.store.getAll();
  }

  /**
   * Gets a webhook by ID
   * @param {string} webhookId - Webhook ID
   * @returns {Promise} - Promise that resolves with the webhook object, or null if not found
   */
  async getById(webhookId) {
    const webhook = await this.store.getById(webhookId);
    if (!webhook) return null;
    return webhook;
  }

  /**
   * Gets webhooks by tag
   * @param {string} tag - Tag string
   * @returns {Promise} - Promise that resolves with an array of webhooks with the given tag,
   * or an empty array if none found
   */
  async getByTag(tag) {
    const webhooks = await this.store.getByTag(tag);
    if (!webhooks) return [];
    return webhooks;
  }

  /**
   * Gets webhooks by events
   * @param {Array} events - Array of event strings
   * @returns {Promise} - Promise that resolves with an array of webhooks with any of the
   * given events, or an empty array if none found
   */
  async getByEvents(events) {
    const webhooks = await this.store.getByEvents(events);
    if (!webhooks) return [];
    return webhooks;
  }

  /**
   * Adds a new webhook
   * @param {Object} hook - Webhook object to add
   * @param {Object} hook.url - URL object with "base" and "relativeUri" properties
   * @param {Array} hook.events - Array of event strings
   * @param {Array} hook.tags - Array of tag strings
   * @param {Object} hook.meta - Object of metadata
   * @param {Array} hook.scopes - Array of scope strings
   * @returns {Promise} - Promise that resolves with the new webhook object
   * @throws {Error} - Throws an error if the required properties are missing or malformed
   */
  async add(hook) {
    if (!hook?.url?.base || !hook?.url?.relativeUri) {
      throw new Error(
        'Missing or malformed url parameter on webhook object',
      );
    }
    if (!hook.events || !Array.isArray(hook.events)) { throw new Error('Missing events parameter or is not an array'); }
    if (!hook.events.length) { throw new Error('events parameter requires at least one event'); }

    const id = crypto.randomUUID();
    const createdDate = new Date();
    const objectToAdd = {
      id,
      tags: hook?.tags || [],
      meta: hook?.meta || {},
      url: hook?.url,
      events: hook?.events,
      scopes: hook?.scopes,
      signatureToken: generateAuthToken(),
      created: createdDate.getTime(),
      modified: createdDate.getTime(),
    };
    const newHook = await this.store.add(objectToAdd);
    return newHook;
  }

  /**
   * Removes a webhook by ID
   * @param {string} webhookId - Webhook ID to remove
   * @returns {Promise} - Promise that resolves with true if successful
   */
  async remove(webhookId) {
    await this.store.remove(webhookId);
    return true;
  }

  /**
   * Triggers all webhooks that match the given event type and options
   * @param {string} eventType - Event type string
   * @param {Object} data - Data object to send with the webhook
   * @param {Object} options - Options object for filtering webhooks
   * @param {Array} options.tags - Array of tag strings for filtering webhooks
   * @param {Array} options.scopes - Array of scope strings for filtering webhooks
   * @returns {Promise} - Promise that resolves with an object containing the number of triggered
   * webhooks, their IDs, and responses
   */
  async tell(eventType = '', data = {}, options = { tags: [], scopes: [] }) {
    console.log('tell called');
    const webhooks = await this.store.getByQuery(
      [eventType],
      options?.tags,
      options?.scopes,
    );

    console.log('found', webhooks);
    if (!webhooks) return null;

    const responsePromises = webhooks.map((hook) => this.httpPost(hook, eventType, data)
      .then((res) => {
        this.emitter.emit('response', {
          webhookId: hook.id,
          type: 'HTTP_SEND_RESPONSE',
          msg: `Received response from server for webhook with ID: ${hook.id}`,
          response: res,
        });
        return res;
      })
      .catch((err) => {
        this.emitter.emit('error', {
          webhookId: hook.id,
          type: 'HTTP_SEND_ERROR',
          msg: `Error triggering webhook with ID: ${hook.id}`,
          error: err,
        });
        return err;
      }));
    const responses = await Promise.allSettled(responsePromises);
    return {
      msg: `Triggered ${webhooks.length} webhook(s)`,
      webhookIds: webhooks.map((e) => e.id),
      responses,
    };
  }

  /**
 * Sends an HTTP POST request to the given webhook
 * @param {Object} hook - Webhook object to send request to
 * @param {string} eventType - Event type string
 * @param {Object} data - Data object to send with the webhook
 * @returns {Promise} - Promise that resolves with the Axios response object
 */
  async httpPost(hook, eventType, data) {
    const url = `${hook?.url?.base}${hook?.url?.relativeUri}`;
    const jsonBody = {
      event: eventType,
      webhookId: hook.id,
      data,
    };
    const rawBody = JSON.stringify(jsonBody);
    const options = {
      method: 'POST',
      url,
      headers: this.buildHeaders(
        this.orgName,
        url,
        rawBody,
        Date.now(),
        hook?.signatureToken,
      ),
      body: rawBody,
    };

    return axios.request(options);
  }
}

export default Teller;
