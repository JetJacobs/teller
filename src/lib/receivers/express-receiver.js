import crypto from 'crypto';
/**
 * Express request object gets converted to a string to be signed
 * @param {*} req
 * @returns {String} formatted string
 */
const buildStringToSign = (url, body, timestamp) => {
  const newString = [url, body, timestamp].join('\n');
  return newString;
};

/**
 * Takes a string and secret to sign with sha256 to base64 hash.
 * @param {String} string
 * @param {*} secret
 * @returns {String} base64 encoded signature
 */
const signString = (string, secret) => {
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(string)
    .digest('base64');
  return hash;
};

export const checkSignature = (company, secret) => (req, res, next) => {
  try {
    const string = buildStringToSign(req);
    const derivedSignature = signString(string, secret);

    if (req.headers[`x-${company}-signature`] === derivedSignature) {
      res.sendStatus(200);
      next();
      return;
    }

    res.status(400).send({
      status: 400,
      message: 'Check your signature',
    });
  } catch {
    console.log('Signature unable to match');
    res.sendStatus(401);
  }
};

export default checkSignature;
