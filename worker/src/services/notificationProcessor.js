const config = require('../config');

const processNotification = async (msg, channel) => {
    if (!msg) return;

    const contentStr = msg.content.toString();
    console.log(`[Worker] Received message: ${contentStr}`);
    
    let notification;
    try {
        notification = JSON.parse(contentStr);
    } catch (e) {
        console.error('[Worker] JSON Parse Error. Moving to DLQ.');
        channel.reject(msg, false);
        return;
    }

    const { userId, message } = notification;

    try {
        if (Math.random() < 0.25) { 
            throw new Error('Simulated transient processing error');
        }

        console.log(`[Worker] Processing notification for user ${userId}: ${message}`);
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
        
        console.log(`[Worker] Notification sent successfully for user ${userId}.`);
        channel.ack(msg);

    } catch (error) {
        console.error(`[Worker] Error processing notification for user ${userId}:`, error.message);

        const headers = msg.properties.headers || {};
        const retryCount = headers['x-retry-count'] || 0;
        const maxRetries = config.retry.attempts;

        if (retryCount < maxRetries) {
            const nextRetry = retryCount + 1;
            const delay = Math.pow(2, retryCount) * config.retry.initialDelay;
            
            console.log(`[Worker] Retrying message for user ${userId}. Attempt: ${nextRetry}. Delaying ${delay}ms`);

            setTimeout(() => {
                try {
                     channel.publish(
                        config.rabbitmq.exchange,
                        config.rabbitmq.routingKey, 
                        msg.content, 
                        {
                            persistent: true,
                            headers: { ...headers, 'x-retry-count': nextRetry }
                        }
                    );
                    channel.ack(msg);
                    console.log(`[Worker] Retry scheduled and original message acknowledged.`);
                } catch (publishErr) {
                    console.error('[Worker] Failed to republish retry message:', publishErr);
                }
            }, delay);

        } else {
            console.error(`[Worker] Max retries (${maxRetries}) exhausted for user ${userId}. Rejecting (DLQ).`);
            channel.reject(msg, false);
        }
    }
};

module.exports = {
  processNotification,
};
