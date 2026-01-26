const success = (res, { message = 'OK', data = null, status = 200 }) =>
  res.status(status).json({ success: true, message, data, errors: null });

const fail = (res, { message = 'Failed', errors = null, status = 400 }) =>
  res.status(status).json({ success: false, message, data: null, errors });

module.exports = { success, fail };
