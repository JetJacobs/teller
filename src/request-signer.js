import crypto, { randomUUID } from 'crypto'

export const buildHeaders = (company, url, body, timestamp, secret) => {
	const headers = {}
	const stringToSign = buildStringToSign(url, body, timestamp)
	headers[`x-${company}-signature`] = signString(stringToSign, secret)
	headers[`x-${company}-timestamp`] = timestamp
	headers[`x-${company}-requestId`] = randomUUID()
	headers[`Content-Type`] = 'application/json'
}

/**
 * Express request object gets converted to a string to be signed by olo
 * @param {*} req
 * @returns {String} formatted string for olo
 */
export const buildStringToSign = (url, body, timestamp) => {
	const newString = [url, body, timestamp].join('\n')
	return newString
}

/**
 * Takes a string and secret to sign with sha256 to base64 hash.
 * This is compatible with olo docs
 * @param {String} string
 * @param {*} secret
 * @returns {String} base64 encoded signature
 */
export const signString = (string, secret) => {
	const hash = crypto
		.createHmac('SHA256', secret)
		.update(string)
		.digest('base64')
	return hash
}

export default buildHeaders
