# One Million CheckBox

A production-grade real-time collaborative checkbox system built with Node.js, Express, Socket.io, and Redis.

![Node.js](https://img.shields.io/badge/Node.js-20.x-green)
![Express](https://img.shields.io/badge/Express-5.x-blue)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-orange)
![Redis](https://img.shields.io/badge/Redis-7.x-red)
![License](https://img.shields.io/badge/License-ISC-green)

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Redis Data Model](#redis-data-model)
- [Security](#security)
- [Performance](#performance)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐       │
│  │   Browser A     │    │   Browser B     │    │   Browser C     │       │
│  │  (User 1)      │    │  (User 2)       │    │  (User 3)       │       │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘       │
└───────────┼─────────────────────┼─────────────────────┼───────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
      ┌─────────────────────────────────────────────────────────────────┐
      │                      LOAD BALANCER                               │
      │                   (Nginx / Cloud LB)                            │
      └────────────────────────────┬────────────────────────────────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            ▼                      ▼                      ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│   Server A        │   │   Server B        │   │   Server C        │
│   (Express +      │   │   (Express +      │   │   (Express +      │
│    Socket.io)     │   │    Socket.io)     │   │    Socket.io)     │
└────────┬──────────┘   └────────┬──────────┘   └────────┬──────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │         REDIS           │
                    │  ┌──────────┬────────┐  │
                    │  │  State   │  Pub/  │  │
                    │  │  Storage │  Sub   │  │
                    │  └──────────┴────────┘  │
                    └────────────────────────┘
```

### Data Flow

1. **Client Action**: User clicks a checkbox
2. **WebSocket Emit**: Client sends `client:checkbox-change` event
3. **Rate Limiting**: Server checks Redis for rate limit
4. **State Update**: Server updates Redis state storage
5. **Publish**: Server publishes to Redis Pub/Sub channel
6. **Broadcast**: All connected servers receive the message
7. **Emit**: Each server broadcasts to its connected clients

---

## Features

### Core Features

- **Real-time Synchronization**: Instant checkbox state updates across all connected clients
- **Multi-server Support**: Horizontal scaling with Redis Pub/Sub
- **State Persistence**: Checkbox states stored in Redis
- **Rate Limiting**: Custom Redis-based rate limiting (5.5s cooldown per user)
- **Health Monitoring**: `/health` endpoint for load balancer checks
- **State API**: REST endpoint to retrieve current checkbox states

### Security Features

- **Connection Tracking**: Track connected users via socket IDs
- **Rate Limiting**: Prevent spam clicks and abuse
- **Input Validation**: Validate incoming checkbox data

### Performance Features

- **Efficient Broadcasting**: Pub/Sub for cross-server communication
- **Connection Pooling**: Redis connection reuse
- **Static File Serving**: Express static file serving with caching

---

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 20.x |
| Framework | Express | 5.x |
| WebSocket | Socket.io | 4.x |
| Database | Redis/Valkey | 7.x |
| Package Manager | npm | 10.x |

### Dependencies

```json
{
  "dependencies": {
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "ioredis": "^5.10.1",
    "socket.io": "^4.8.3"
  }
}
```

---

## Project Structure

```
one_million_checkbox/
├── .env                    # Environment variables
├── .gitignore              # Git ignore rules
├── docker-compose.yml      # Docker services configuration
├── index.js                # Main application entry point
├── package.json            # NPM dependencies and scripts
├── package-lock.json       # Locked dependency versions
├── README.md               # This file
└── public/                 # Static files directory
    └── index.html          # Frontend application
```

---

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- Docker and Docker Compose
- Redis 7.x (via Docker)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd one_million_checkbox
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start Redis**

```bash
docker-compose up -d
```

5. **Start the development server**

```bash
npm run dev
```

6. **Access the application**

Open your browser and navigate to:
- HTTP: `http://localhost:9000`

---

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `9000` | No |
| `REDIS_HOST` | Redis host | `localhost` | No |
| `REDIS_PORT` | Redis port | `6379` | No |
| `NODE_ENV` | Environment | `development` | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `CHECKBOX_COUNT` | Number of checkboxes | `100` | No |

### Example `.env` file

```env
PORT=9000
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
LOG_LEVEL=info
CHECKBOX_COUNT=100
```

---

## API Reference

### REST Endpoints

#### GET `/health`

Health check endpoint for load balancers and monitoring.

**Response:**

```json
{
  "message": "Server is healthy",
  "healthy": true
}
```

#### GET `/state`

Get current checkbox states.

**Response:**

```json
{
  "checkboxes": [false, true, false, true, false, ...]
}
```

**Status Codes:**

- `200 OK`: Successfully retrieved state
- `500 Internal Server Error`: Redis connection error

---

## WebSocket Events

### Client → Server Events

#### `client:checkbox-change`

Sent when a user clicks a checkbox.

**Payload:**

```javascript
{
  id: number,      // Checkbox index (0-99)
  checked: boolean // New checked state
}
```

**Example:**

```javascript
socket.emit('client:checkbox-change', { id: 5, checked: true });
```

### Server → Client Events

#### `server:checkbox-change`

Broadcast when any user changes a checkbox.

**Payload:**

```javascript
{
  id: number,      // Checkbox index
  checked: boolean // New checked state
}
```

#### `server:rate-limit`

Sent when a user exceeds rate limit.

**Payload:**

```javascript
{
  message: string  // Wait time message
}
```

#### `server:error`

Sent on server errors.

**Payload:**

```javascript
{
  message: string  // Error message
}
```

---

## Redis Data Model

### Keys

| Key | Type | Description |
|-----|------|-------------|
| `checkbox_state` | String | JSON array of boolean values |
| `rate-limiting:{socketId}` | String | Unix timestamp of last action |

### Channels

| Channel | Description |
|---------|-------------|
| `internal-server:checkbox-change` | Pub/Sub for cross-server sync |

### Data Examples

```bash
# checkbox_state
GET checkbox_state
# Output: "[false,true,false,true,false,false,true,false,false,true,...]"

# rate-limiting
GET rate-limiting:abc123
# Output: "1714652400000"
```

---

## Security

### Rate Limiting

- **Cooldown Period**: 5.5 seconds between checkbox changes
- **Scope**: Per socket connection
- **Storage**: Redis (supports multi-server deployments)
- **Response**: `server:rate-limit` event with wait time message

### Input Validation

- Checkbox ID must be a valid integer
- Checkbox state must be a boolean
- Invalid inputs are rejected with error event

### Connection Management

- Socket connections are tracked
- Disconnect events are logged
- No sensitive data stored in socket session

---

## Performance

### Optimization Strategies

1. **Redis Connection Pooling**: Reuse Redis connections for publisher/subscriber
2. **Efficient Pub/Sub**: Use Redis Pub/Sub for cross-server communication
3. **Static File Caching**: Configure appropriate cache headers
4. **Minimal JSON Parsing**: Parse only necessary data

### Benchmarks

| Metric | Value |
|--------|-------|
| Max Checkboxes | Configurable (default: 100) |
| Rate Limit | 1 request per 5.5 seconds |
| Pub/Sub Latency | < 10ms (local Redis) |
| Connection Limit | Depends on server resources |

### Scaling Considerations

- Add more Express/Socket.io instances behind a load balancer
- Redis Pub/Sub automatically syncs state across instances
- Consider Redis Cluster for very high load

---

## Deployment

### Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  valkey:
    image: valkey/valkey
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: valkey-server --appendonly yes

  app:
    build: .
    ports:
      - "9000:9000"
    environment:
      - REDIS_HOST=valkey
      - PORT=9000
    depends_on:
      - valkey

volumes:
  redis_data:
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure proper Redis authentication
- [ ] Enable TLS/SSL for WebSocket connections
- [ ] Set up load balancer (Nginx, HAProxy)
- [ ] Configure logging (JSON format)
- [ ] Set up monitoring and alerts
- [ ] Configure health check endpoints
- [ ] Set up graceful shutdown handling

### Environment-Specific Configuration

#### Development

```env
NODE_ENV=development
LOG_LEVEL=debug
REDIS_HOST=localhost
```

#### Production

```env
NODE_ENV=production
LOG_LEVEL=warn
REDIS_HOST=redis.internal
REDIS_PASSWORD=your-secure-password
```

---

## Monitoring

### Health Checks

```bash
# HTTP health check
curl http://localhost:9000/health

# Expected response
{"message":"Server is healthy","healthy":true}
```

### Logging

The application logs:

- Server startup
- Client connections/disconnections
- Checkbox changes
- Rate limit violations
- Redis errors
- Pub/Sub messages

### Metrics to Monitor

| Metric | Description | Alert Threshold |
|--------|-------------|------------------|
| Connection Count | Active WebSocket connections | > 10000 |
| Message Rate | Messages per second | > 1000/s |
| Redis Latency | Redis operation time | > 100ms |
| Error Rate | Failed operations | > 1% |

---

## Troubleshooting

### Common Issues

#### 1. Redis Connection Failed

**Symptom:** `Failed to subscribe to Redis channel`

**Solution:**

```bash
# Check if Redis is running
docker-compose ps

# Check Redis logs
docker-compose logs valkey

# Test Redis connection
redis-cli ping
# Should return: PONG
```

#### 2. WebSocket Connection Issues

**Symptom:** Client cannot connect

**Solution:**

- Check firewall rules
- Verify correct WebSocket URL
- Check server logs for errors

#### 3. Rate Limiting False Positives

**Symptom:** Legitimate users getting rate limited

**Solution:**

- Check system clock synchronization
- Review rate limit timing in Redis
- Adjust cooldown period if needed

#### 4. State Not Syncing Across Servers

**Symptom:** Checkbox changes not reflecting on all clients

**Solution:**

- Verify Redis Pub/Sub is working
- Check all servers subscribe to the same channel
- Review network connectivity between servers

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev
```

### Check Server Status

```bash
# Check connections
curl http://localhost:9000/state

# Check health
curl http://localhost:9000/health
```

---

## Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use ES Modules (import/export)
- Follow existing code formatting
- Add comments for complex logic
- Write meaningful commit messages

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

---

## License

Copyright © 2026 Subransu Sekhar Maharana

ISC License - See [LICENSE](LICENSE) file for details.

---

## Support

### Resources

- [Socket.io Documentation](https://socket.io/docs/)
- [ioredis Documentation](https://ioredis.readthedocs.io/)
- [Express Documentation](https://expressjs.com/)
- [Redis Documentation](https://redis.io/docs/)

### Contact

For issues and feature requests, please open an issue on GitHub.

---

## Appendix

### A. WebSocket Protocol Details

| Aspect | Details |
|--------|---------|
| Protocol | WebSocket (ws://) |
| Fallback | HTTP long-polling |
| Heartbeat | 25 seconds (Socket.io default) |
| Reconnection | Automatic |

### B. Redis Pub/Sub Flow

```
Server A                    Redis                    Server B
   │                         │                          │
   ├───publish(message)────>│                          │
   │                         ├───subscribe─────────────>│
   │                         │<───message───────────────┤
   │                         │<───publish(message)──────┤
   │<───message─────────────┤                          │
   │                         │                          │
```

### C. Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

*Last updated: May 2026*