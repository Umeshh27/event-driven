const rabbitMQService = require('./services/rabbitmqService');

const startWorker = async () => {
  try {
    await rabbitMQService.connect();
    
    // Keep process alive
    process.on('SIGINT', async () => {
        console.log('[Worker] Shutting down...');
        await rabbitMQService.close();
        process.exit(0);
    });

  } catch (error) {
    console.error('[Worker] Startup failed:', error);
    process.exit(1);
  }
};

startWorker();
