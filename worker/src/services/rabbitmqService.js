const amqp = require('amqplib');
const config = require('../config');
const { processNotification } = require('./notificationProcessor');

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
            console.log(`[RabbitMQ Worker] Connecting to ${host}:${port} (Attempt ${i + 1})...`);
            this.connection = await amqp.connect(url);
            this.channel = await this.connection.createChannel();
            
            await this.setupTopology();
            
            console.log('[RabbitMQ Worker] Connected and Topology setup complete.');
            
            this.connection.on('error', (err) => {
                console.error('[RabbitMQ Worker] Connection error', err);
                this.close();
            });
            
            this.connection.on('close', () => {
                console.warn('[RabbitMQ Worker] Connection closed');
            });

            return;
        } catch (error) {
            console.error(`[RabbitMQ Worker] Connection failed: ${error.message}`);
             if (i < connectionRetries - 1) {
                await new Promise(res => setTimeout(res, retryInterval));
            } else {
                console.error('[RabbitMQ Worker] Max retries reached. Exiting.');
                process.exit(1);
            }
        }
    }
  }

  async setupTopology() {
      const { exchange, queue, routingKey, dlx, dlq } = config.rabbitmq;

      // 1. Assert Exchanges
      await this.channel.assertExchange(exchange, 'direct', { durable: true });
      await this.channel.assertExchange(dlx, 'direct', { durable: true });

      // 2. Assert DLQ and Bind
      await this.channel.assertQueue(dlq, { durable: true });
      await this.channel.bindQueue(dlq, dlx, routingKey); // Bind DLQ to DLX with same routing key? Or catch all?
      // Prompt says: "notification_dlq should then consume from notification_dlx"
      // Usually DLX routes with the original routing key.
      // So if original is 'notification.send', DLX will route 'notification.send' to DLQ if bound.
      
      // 3. Assert Main Queue with Dead Letter Config
      await this.channel.assertQueue(queue, {
          durable: true,
          arguments: {
              'x-dead-letter-exchange': dlx,
              // 'x-dead-letter-routing-key': routingKey // Optional: if we want to change it. Default uses original.
          }
      });
      
      // 4. Bind Main Queue
      await this.channel.bindQueue(queue, exchange, routingKey);

      // 5. Start Consuming Main Queue
      // prefetch(1) is good for fair dispatch especially with simulated delays
      this.channel.prefetch(1);
      
      this.channel.consume(queue, (msg) => {
          processNotification(msg, this.channel);
      }, { noAck: false }); // Manual ack in processor

      console.log(`[RabbitMQ Worker] Consuming from ${queue}`);
  }
  
  async close() {
    try {
        if (this.channel) await this.channel.close();
        if (this.connection) await this.connection.close();
    } catch (err) {
        console.warn('[RabbitMQ Worker] Error while closing:', err);
    }
  }
}

module.exports = new RabbitMQService();
