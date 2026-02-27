const amqp = require('amqplib');
const config = require('../config');

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    const { user, pass, host, port, retryInterval, connectionRetries } = config.rabbitmq;
    const url = `amqp://${user}:${pass}@${host}:${port}`;

    for (let i = 0; i < connectionRetries; i++) {
        try {
            console.log(`[RabbitMQ] Attempting connection to ${host}:${port} (Attempt ${i + 1})...`);
            this.connection = await amqp.connect(url);
            this.channel = await this.connection.createChannel();
            
            await this.channel.assertExchange(config.rabbitmq.exchange, 'direct', { durable: true });
            
            console.log('[RabbitMQ] Connected and Exchange asserted.');
            
            this.connection.on('error', (err) => {
                console.error('[RabbitMQ] Connection error', err);
                this.close();
            });
            
            this.connection.on('close', () => {
                console.warn('[RabbitMQ] Connection closed');
            });

            return;
        } catch (error) {
            console.error(`[RabbitMQ] Connection failed: ${error.message}`);
            if (i < connectionRetries - 1) {
                await new Promise(res => setTimeout(res, retryInterval));
            } else {
                console.error('[RabbitMQ] Max retries reached. Exiting.');
                process.exit(1);
            }
        }
    }
  }

  async publishNotification(notification) {
    if (!this.channel) {
      console.error('[RabbitMQ] Channel is NULL inside publishNotification');
      throw new Error('[RabbitMQ] Channel not initialized');
    }

    const { exchange, routingKey } = config.rabbitmq;
    const msg = JSON.stringify(notification);

    try {
        console.log(`[RabbitMQ] Publishing to exchange: ${exchange}, key: ${routingKey}`);
        const result = this.channel.publish(exchange, routingKey, Buffer.from(msg), {
            persistent: true
        });
        
        if (result) {
            console.log(`[RabbitMQ] Message published to ${exchange}/${routingKey}`);
        } else {
            console.warn('[RabbitMQ] Channel write buffer full');
        }
        return result;
    } catch (error) {
        console.error('[RabbitMQ] Publish error:', error);
        throw error;
    }
  }


  async close() {
    try {
        if (this.channel) await this.channel.close();
        if (this.connection) await this.connection.close();
    } catch (err) {
        console.warn('[RabbitMQ] Error while closing:', err);
    }
  }
}

module.exports = new RabbitMQService();
