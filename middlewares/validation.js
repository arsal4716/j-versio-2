// const { success, fail } = require('../utils/response');
// const Joi = require('joi');

// const validateFormSubmission = (req, res, next) => {
//   const schema = Joi.object({
//     firstName: Joi.string().min(1).max(100).required().label('First Name'),
//     lastName: Joi.string().min(1).max(100).required().label('Last Name'),
//     phoneNo: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required().label('Phone Number'),
//     email: Joi.string().email().required().label('Email'),
//     state: Joi.string().min(2).max(50).required().label('State'),
//     zipCode: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required().label('ZIP Code'),
//     dob: Joi.string().required().label('Date of Birth'),
//     consent: Joi.boolean().default(false).label('Consent'),
//     additionalData: Joi.object().unknown()
//   });

//   const { error } = schema.validate(req.body, { abortEarly: false });
  
//   if (error) {
//     const errors = error.details.reduce((acc, detail) => {
//       acc[detail.path.join('.')] = detail.message.replace(/"/g, '');
//       return acc;
//     }, {});

//     return fail(res, {
//       message: 'Form validation failed',
//       errors,
//       status: 400
//     });
//   }

//   next();
// };

// const validateCenterId = (req, res, next) => {
//   const schema = Joi.object({
//     centerId: Joi.string().hex().length(24).required()
//   });

//   const { error } = schema.validate(req.params);
  
//   if (error) {
//     return fail(res, {
//       message: 'Invalid center ID',
//       status: 400
//     });
//   }

//   next();
// };

// const validateCampaignName = (req, res, next) => {
//   const schema = Joi.object({
//     campaignName: Joi.string().min(1).max(100).required()
//   });

//   const { error } = schema.validate(req.params);
  
//   if (error) {
//     return fail(res, {
//       message: 'Invalid campaign name',
//       status: 400
//     });
//   }

//   next();
// };

// module.exports = {
//   validateFormSubmission,
//   validateCenterId,
//   validateCampaignName
// };