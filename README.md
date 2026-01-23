# Event-Driven Notification Service

A robust, production-ready microservice for sending asynchronous notifications. Built with **Node.js** (Express) and **RabbitMQ**, featuring a resilient event-driven architecture with automatic retries and Dead Letter Queue (DLQ) support.

---

## 🚀 Features

- **Event-Driven Architecture**: Decoupled API (Producer) and Worker (Consumer) services.
- **Reliable Messaging**: Uses RabbitMQ persistent queues and durable messages.
- **Fault Tolerance**:
  - **Exponential Backoff Retries**: Automatically retries failed operations with increasing delays ($2^n \times 1s$).
  - **Dead Letter Queue (DLQ)**: Captures messages that fail after maximum retries for manual inspection.
- **Observability**: Prometheus metrics and structured logging.
- **Containerization**: Fully Dockerized with `docker-compose` orchestration and health checks.

## 📂 Project Structure

```bash
event-driven/
├── api/                        # API Service (Producer)
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   ├── services/           # RabbitMQ Publisher
│   │   ├── utils/              # Validation (Joi)
│   │   └── app.js              # Express App setup
│   └── tests/                  # Integration tests
├── worker/                     # Worker Service (Consumer)
│   ├── src/
│   │   ├── services/           # RabbitMQ Consumer & Processor
│   │   └── worker.js           # Worker entry point
│   └── tests/                  # Unit tests
├── docker-compose.yml          # Service Orchestration
├── .env.example                # Environment variables
└── README.md                   # Documentation
```

## 🛠️ Tech Stack

- **Runtime**: Node.js v18
- **Message Broker**: RabbitMQ (Management Plugin enabled)
- **Framework**: Express.js
- **Tools**: Docker, Docker Compose, Joi, Swagger/OpenAPI

## 🏗️ Architecture & Logic

### Notification Flow

1.  **Client** POSTs to `/api/notifications/send`.
2.  **API** validates input and publishes a `notification.send` event to `notification_exchange`.
3.  **RabbitMQ** routes the message to `notification_queue`.
4.  **Worker** consumes the message:
    - **Success**: Logs success and Acks the message.
    - **Transient Failure**: (Simulated 25% chance)
      - Retries up to **3 times**.
      - Delay strategy: `1s`, `2s`, `4s`.
    - **Permanent Failure**:
      - After 3 retries, the message is **rejected** (without requeue).
      - RabbitMQ automatically moves it to the **DLX** (`notification_dlx`) -> **DLQ** (`notification_dlq`).

## ⚡ Setup & Running

### Prerequisites

- Docker installed and running.

### Quick Start

1.  **Start the Stack**:

    ```bash
    docker-compose up -d --build
    ```

    _This will start RabbitMQ, API, and Worker containers._

2.  **Check Services**:
    ```bash
    docker-compose ps
    ```

## 🔌 API Documentation

| Service         | Port  | URL                              | Description                               |
| :-------------- | :---- | :------------------------------- | :---------------------------------------- |
| **API**         | 3000  | `http://localhost:3000`          | Main application endpoint                 |
| **Swagger UI**  | 3000  | `http://localhost:3000/api-docs` | Interactive API documentation             |
| **Metrics**     | 3000  | `http://localhost:3000/metrics`  | Prometheus metrics                        |
| **RabbitMQ**    | 5672  | `amqp://localhost:5672`          | AMQP Protocol                             |
| **RabbitMQ UI** | 15672 | `http://localhost:15672`         | Management Dashboard (User/Pass: `guest`) |

### `POST /api/notifications/send`

**Request Body**:

```json
{
  "userId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "message": "Your order #12345 has shipped!"
}
```

**Responses**:

- `202 Accepted`: Event queued successfully.
- `400 Bad Request`: Invalid UUID or empty message.

## 🧪 Testing

### Automated Tests

Run tests inside the isolated containers:

```bash
# Run API Integration Tests
docker-compose exec api npm test

# Run Worker Unit Tests
docker-compose exec worker npm test
```

### Manual Verification

**1. Send Notification**:

```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"userId": "a1b2c3d4-e5f6-7890-1234-567890abcdef", "message": "Test Message"}'
```

**2. View Logs**:
Check the worker process to see consumption and retry logic in action:

```bash
docker-compose logs -f worker
```

**3. Test Dead Letter Queue**:
Since the worker simulates a 25% failure rate, send multiple requests. Eventually, you will see a message fail 3 times and move to the DLQ:

> `[Worker] Max retries (3) exhausted for user ... Rejecting (DLQ).`

## ⚙️ Configuration

Environment variables can be configured in `.env` (or use defaults in `docker-compose.yml`):

- `RABBITMQ_HOST`: Hostname of the broker.
- `RETRY_ATTEMPTS`: Max retries (Default: 3).
- `INITIAL_RETRY_DELAY_MS`: Base delay for backoff (Default: 1000ms).
