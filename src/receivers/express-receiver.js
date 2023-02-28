export const checkSignature = (
	buildStringToSign,
	signString,
	company,
	secret
) => {
	return (req, res, next) => {
		try {
			const string = buildStringToSign(req)
			const derivedSignature = signString(string, secret)

			if (req.headers[`x-${company}-signature`] === derivedSignature) {
				res.sendStatus(200)
				return next()
			}

			res.status(400).send({
				status: 400,
				message: 'Check your signature',
			})
		} catch {
			console.log('Signature unable to match')
			res.sendStatus(401)
		}
	}
}
