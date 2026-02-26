// backend/middlewares/validate.js
function validate(schema, prop = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[prop], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }
    req[prop] = value;
    next();
  };
}

module.exports = validate;