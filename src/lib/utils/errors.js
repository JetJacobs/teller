export class CustomError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errors = {
};

export default {
  CustomError,
  errors,
  ...errors,
};
