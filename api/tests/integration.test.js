const request = require('supertest');
const app = require('../src/app');
const rabbitMQService = require('../src/services/rabbitmqService');

jest.mock('../src/services/rabbitmqService');

describe('POST /api/notifications/send', () => {
  beforeAll(() => {
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
