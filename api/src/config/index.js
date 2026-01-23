require("dotenv").config();

module.exports = {
  port: process.env.API_PORT || 3000,
  rabbitmq: {
    host: process.env.RABBITMQ_HOST || "localhost",
    port: process.env.RABBITMQ_PORT || 5672,
    user: process.env.RABBITMQ_USER || "guest",
    pass: process.env.RABBITMQ_PASS || "guest",
    exchange: process.env.NOTIFICATION_EXCHANGE || "notification_exchange",
    routingKey: process.env.NOTIFICATION_ROUTING_KEY || "notification.send",
    connectionRetries: 10,
    retryInterval: 5000,
  },
};
