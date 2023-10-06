import { CustomError } from '../utils/errors';

export const isValidProvider = (obj) => {
  const required = [
    { name: 'getById', type: 'function' },
    { name: 'getByQuery', type: 'function' },
  ];

  for (let i = 0; i < required.length; i += 1) {
    const requiredField = required[i];
    if (obj[requiredField?.name]) { throw new CustomError(`Missing field ${requiredField.name}`); }
    const fieldType = typeof obj[requiredField.name];
    if (fieldType !== requiredField?.type) {
      throw new CustomError(`Field ${requiredField.name} expected type ${
        requiredField?.type
      } got ${typeof obj[requiredField?.name]}`);
    }
  }
  return true;
};

export default isValidProvider;
