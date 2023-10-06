export class CustomStatusError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status || 500;
    this.statusCode = status || 500;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errors = {
  SEARCH_ERROR: new CustomStatusError('Search Error', 500),
};

export default {
  CustomStatusError,
  errors,
  ...errors,
};
