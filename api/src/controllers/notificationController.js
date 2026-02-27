const rabbitMQService = require('../services/rabbitmqService');
const { validateNotification } = require('../utils/validation');
const client = require('prom-client');

const notificationCounter = new client.Counter({
  name: 'notification_published_total',
  help: 'Total number of notification events published',
});

const sendNotification = async (req, res, next) => {
  try {
    const { error, value } = validateNotification(req.body);
    if (error) {
        return res.status(400).json({
            error: 'Invalid input',
            details: error.details.map(d => d.message).join(', ')
        });
    }

    const { userId, message } = value;

    await rabbitMQService.publishNotification({ userId, message });
    
    notificationCounter.inc();

    res.status(202).json({
      status: 'Notification event queued successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendNotification,
};
