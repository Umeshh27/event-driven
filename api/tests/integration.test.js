const request = require('supertest');
const app = require('../src/app');
const rabbitMQService = require('../src/services/rabbitmqService');

// Mock rabbitMQService.publishNotification to avoid dependency on actual RabbitMQ during this specific test run 
// OR use actual RabbitMQ if we want full integration.
// Prompt says "Integration tests... verify endpoint behavior and event publishing."
// Usually integration implies real deps, but supertest often used with mocks for speed.
// However, E2E requires real deps.
// Let's Mock publish for stricter API integration separation, 
// AND rely on the separate E2E or just assume "Integration" here means "API HTTP -> Controller -> Service".

// If I mock it, it's safer for running 'npm test' without docker up.
// But the prompt says "docker-compose exec api npm test" which implies docker is UP.
// So I will try to use the REAL rabbitmq service if possible, or mock if it's flaky.
// Given the constraints and reliability, mocking the *service* method is best for API testing 
// to ensure HTTP layers work. REAL RabbitMQ testing is best done in the "End-to-end" check.

jest.mock('../src/services/rabbitmqService');

describe('POST /api/notifications/send', () => {
  beforeAll(() => {
    // Silence console logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  it('should return 202 and publish message for valid input', async () => {
    const validPayload = {
      userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      message: 'Hello World'
    };

    rabbitMQService.publishNotification.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/notifications/send')
      .send(validPayload);

    expect(res.statusCode).toEqual(202);
    expect(res.body).toHaveProperty('status', 'Notification event queued successfully');
    expect(rabbitMQService.publishNotification).toHaveBeenCalledWith(validPayload);
  });

  it('should return 400 for invalid UUID', async () => {
    const invalidPayload = {
      userId: 'not-a-uuid',
      message: 'Hello World'
    };

    const res = await request(app)
      .post('/api/notifications/send')
      .send(invalidPayload);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error', 'Invalid input');
    expect(res.body.details).toContain('userId must be a valid UUID');
    expect(rabbitMQService.publishNotification).not.toHaveBeenCalled();
  });

  it('should return 400 for empty message', async () => {
    const invalidPayload = {
      userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      message: ''
    };

    const res = await request(app)
      .post('/api/notifications/send')
      .send(invalidPayload);

    expect(res.statusCode).toEqual(400);
  });
});
