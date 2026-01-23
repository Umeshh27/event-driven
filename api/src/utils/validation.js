const Joi = require('joi');

const notificationSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    'string.uuid': 'userId must be a valid UUID',
    'any.required': 'userId is required',
  }),
  message: Joi.string().min(1).required().messages({
    'string.empty': 'message must be a non-empty string',
    'any.required': 'message is required',
  }),
});

const validateNotification = (data) => {
  return notificationSchema.validate(data, { abortEarly: false });
};

module.exports = {
  validateNotification,
};
