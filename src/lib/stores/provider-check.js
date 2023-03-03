export const isValidProvider = (obj) => {
	const required = [{ name: '', type: '' }]
	const errors = []
	for(let i = 0; i < required.length; i++){
		const requiredField = required[i]
		if (obj.hasOwnProperty(requiredField.name))
			throw `Missing field ${requiredField.name}`
		if (typeof obj[requiredField.name] !== type)
			throw `Field ${requiredField.name} expected type ${
					requiredField.type
				} got ${typeof obj[requiredField.name]}`,
			
	}
	return true
}
