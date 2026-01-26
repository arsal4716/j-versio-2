const { fail } = require('../utils/response');

module.exports = (err, req, res, next) => {
  console.error(err);

  const status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  if (err.name === 'ValidationError') {
    errors = {};
    Object.keys(err.errors).forEach((key) => {
      errors[key] = err.errors[key].message;
    });
    message = 'Validation failed';
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    errors = { [field]: `${field} already exists` };
    message = 'Duplicate field';
  }

  return fail(res, { message, errors, status });
};
