# Breezy - Microservices Architecture

A modern social platform built with a microservices architecture.

# LINK: [breezy api docs](https://docs.breezy.website/docs/)

## Architecture

Our application is divided into 5 **INDEPENDENT** microservices:

### Auth Service (Port 3001)
* Authentication and authorization
* JWT token management
* **Centralized token validation** (endpoint /auth/validate-token)
* Password reset
* Email verification
* **Database:** MongoDB Auth (independent)

### User Service (Port 3002)
* User profile management
* Follow/unfollow system
* Account validation
* **Database:** MongoDB Users (independent)
* **Authentication:** HTTP calls to Auth Service for token validation

### Post Service (Port 3003)
* Post creation and management
* Comment system
* Like system
* Tag management
* **Database:** MongoDB Posts (independent)
* **Authentication:** HTTP calls to Auth Service for token validation

### Notification Service (Port 3004)
* Real-time notifications
* Private messages
* System alerts
* **Database:** MongoDB Notifications (independent)
* **Authentication:** HTTP calls to Auth Service for token validation
* **Communication:** WebSocket + HTTP to other services

### API Gateway (Port 3000)
* Single entry point
* Request routing
* Centralized authentication via Auth Service
* Rate limiting
* Unified Swagger documentation

## Microservices Principles Respected

### ✅ Complete Independence
- Each service has its own database
- Each service can be deployed independently
- **No shared code** (removal of shared folder)
- **Distributed authentication** via HTTP calls

### ✅ Inter-Service Communication
- Communication via HTTP/REST only
- Centralized authentication in auth-service
- Token validation via dedicated endpoint
- No direct dependencies between services

### ✅ Distributed Security
- JWT tokens signed and verified by auth-service
- Centralized user validation
- Optional local cache for performance
- Resilient error handling

## Communication Architecture

```
Frontend (React/Vue/Angular)
    ↓
API Gateway (Port 3000)
    ↓
┌─────────────────────────────────────────────────────┐
│  Auth Service     User Service     Post Service     │
│  (Port 3001)      (Port 3002)      (Port 3003)     │
│       ↓               ↓               ↓            │
│  MongoDB Auth    MongoDB Users   MongoDB Posts     │
│       ↑               ↑               ↑            │
│       └───────────────┼───────────────┘            │
│                 Token Validation                   │
└─────────────────────────────────────────────────────┘
    ↓
Notification Service (Port 3004)
    ↓
MongoDB Notifications + WebSocket
    ↑
Token Validation via Auth Service
```

## Authentication Flow

1. **Login:** Frontend → API Gateway → Auth Service
2. **Token Generation:** Auth Service generates JWT
3. **API Calls:** Frontend → API Gateway → Service with token
4. **Token Validation:** Service → Auth Service (/auth/validate-token)
5. **Response:** Auth Service returns user info or error

## Quick Start

To start the application, use Docker Compose:

```bash
# Remove the old shared folder
rm -rf microservices/shared
docker-compose up --build
```

## Tests

To run tests, use the following command:

```bash
# Tests for a specific service
docker exec breezy-auth-service npm test
docker exec breezy-user-service npm test

# Tests for all services
npm run test
```

## Monitoring

- Health checks: `GET /health` on each service
- Global status: `GET http://localhost:8080/`
- Documentation: `http://localhost:8080/docs`
