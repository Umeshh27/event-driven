const { processNotification } = require('../src/services/notificationProcessor');
const config = require('../src/config');

// Mock config to deterministic values
jest.mock('../src/config', () => ({
    rabbitmq: {
        exchange: 'test_exchange',
        routingKey: 'test_key'
    },
    retry: {
        attempts: 3,
        initialDelay: 10
    }
}));

describe('Notification Processor', () => {
    let mockChannel;
    let mockMsg;

    beforeEach(() => {
        mockChannel = {
            ack: jest.fn(),
            reject: jest.fn(),
            publish: jest.fn()
        };
        mockMsg = {
            content: Buffer.from(JSON.stringify({
                userId: '123-uuid',
                message: 'Test Message'
            })),
            properties: {
                headers: {}
            }
        };
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should ack message on success', async () => {
        // Force random to be > 0.25 (no failure)
        jest.spyOn(Math, 'random').mockReturnValue(0.9);

        await processNotification(mockMsg, mockChannel);

        expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
        expect(mockChannel.reject).not.toHaveBeenCalled();
        expect(mockChannel.publish).not.toHaveBeenCalled();
    });

    it('should retry on transient failure if retries < limit', async () => {
        // Force fail
        jest.spyOn(Math, 'random').mockReturnValue(0.1); 
        
        // Mock setTimeout to run immediately
        jest.useFakeTimers();
        
        const promise = processNotification(mockMsg, mockChannel);
        
        jest.runAllTimers();
        await promise;

        // Should publish to retry
        expect(mockChannel.publish).toHaveBeenCalled();
        // Should ack original
        expect(mockChannel.ack).toHaveBeenCalled();
        
        const publishCall = mockChannel.publish.mock.calls[0];
        // Check headers
        expect(publishCall[3].headers['x-retry-count']).toBe(1);

        jest.useRealTimers();
    });

    it('should reject (DLQ) if retries exhausted', async () => {
        // Force fail
        jest.spyOn(Math, 'random').mockReturnValue(0.1);

        mockMsg.properties.headers['x-retry-count'] = 3;

        await processNotification(mockMsg, mockChannel);

        expect(mockChannel.reject).toHaveBeenCalledWith(mockMsg, false);
        expect(mockChannel.publish).not.toHaveBeenCalled();
    });
});
