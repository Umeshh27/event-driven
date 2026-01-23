require('dotenv').config();

module.exports = {
  rabbitmq: {
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: process.env.RABBITMQ_PORT || 5672,
    user: process.env.RABBITMQ_USER || 'guest',
    pass: process.env.RABBITMQ_PASS || 'guest',
    exchange: process.env.NOTIFICATION_EXCHANGE || 'notification_exchange',
    queue: process.env.NOTIFICATION_QUEUE || 'notification_queue',
    routingKey: process.env.NOTIFICATION_ROUTING_KEY || 'notification.send',
    dlx: process.env.DLX_NAME || 'notification_dlx',
    dlq: process.env.DLQ_NAME || 'notification_dlq', 
    connectionRetries: 10,
    retryInterval: 5000,
  },
  retry: {
      attempts: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
      initialDelay: parseInt(process.env.INITIAL_RETRY_DELAY_MS || '1000', 10),
  }
};
