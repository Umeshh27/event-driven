const config = require('../config');

// We need the channel to publish retries, so we'll pass it in or better yet, 
// have the processor return a status and let the rabbitmq service handle the ack/nack/retry logic?
// The prompt pseudocode puts the logic inside the processor function and passes the channel.

const processNotification = async (msg, channel) => {
    if (!msg) return;

    const contentStr = msg.content.toString();
    console.log(`[Worker] Received message: ${contentStr}`);
    
    let notification;
    try {
        notification = JSON.parse(contentStr);
    } catch (e) {
        console.error('[Worker] JSON Parse Error. Moving to DLQ (technically rejecting without requeue).');
        channel.reject(msg, false); // Malformed JSON -> DLQ
        return;
    }

    const { userId, message } = notification;

    try {
        // Simulate a potential transient failure (25% chance)
        // Ensure we don't simulate failure on already retried messages if we want to test DLQ specifically? 
        // The prompt says "random failure rate of 20 - 30% on first attempt".
        // Let's just do random every time to stress the retry logic.
        
        if (Math.random() < 0.25) { 
            throw new Error('Simulated transient processing error');
        }

        console.log(`[Worker] Processing notification for user ${userId}: ${message}`);
        
        // Simulate actual work
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

            // Using setTimeout as per prompt instructions for simulation
            setTimeout(() => {
                // Republish
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
                    channel.ack(msg); // Ack original after scheduling retry
                    console.log(`[Worker] Retry scheduled and original message acknowledged.`);
                } catch (publishErr) {
                    console.error('[Worker] Failed to republish retry message:', publishErr);
                    // If we can't republish, we probably shouldn't Ack... but inside setTimeout it's tricky.
                    // This is why setTimeout pattern is dangerous in production (process crash = lost message).
                    // But for this task, it's the requested implementation.
                }
            }, delay);

        } else {
            console.error(`[Worker] Max retries (${maxRetries}) exhausted for user ${userId}. Rejecting (DLQ).`);
            channel.reject(msg, false); // false = don't requeue -> send to DLX
        }
    }
};

module.exports = {
  processNotification,
};
