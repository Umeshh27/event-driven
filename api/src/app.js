const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const client = require('prom-client');
const config = require('./config');
const { sendNotification } = require('./controllers/notificationController');
const rabbitMQService = require('./services/rabbitmqService');
const errorHandler = require('./middlewares/errorHandler');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());

// Metrics Setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

// Routes
app.post('/api/notifications/send', sendNotification);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

// Swagger
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Error Handler
app.use(errorHandler);

// Start Server
const startServer = async () => {
    try {
        await rabbitMQService.connect();
        app.listen(config.port, () => {
            console.log(`[API] Server running on port ${config.port}`);
            console.log(`[API] Docs available at http://localhost:${config.port}/api-docs`);
        });
    } catch (error) {
        console.error('[API] Failed to start server:', error);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = app;
