# Microservice Mall

> **This project is mainly built for practicing microservice technologies.**

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Modules & Ports](#modules--ports)
- [Features](#features)
- [Getting Started](#getting-started)

---

## Project Overview

| Item | Description |
|---|---|
| **Purpose** | Practicing a microservice tech stack (a learning project) |
| **Domain** | Simplified e-commerce: products → cart → order → payment → order management, including users, address book and account balance |
| **Frontend** | React 18 + Vite + Ant Design 5 (login, product search, cart, order placement & payment, order and address management) |

---

## Tech Stack

| Category | Technologies |
|---|---|
| Foundation | Spring Boot 2.7.12 · Spring Cloud 2021.0.3 · Spring Cloud Alibaba 2021.0.4.0 |
| Service governance | Nacos (service discovery + config center) · Spring Cloud Gateway · OpenFeign · Sentinel |
| Data & transactions | MySQL 8 · MyBatis-Plus · Seata (AT mode) |
| Messaging & caching | RabbitMQ (delayed-message plugin + dead-letter queue) · Redis |
| Security | JWT (RSA, `hmall.jks`) · unified authentication and user-identity propagation at the gateway |
| Frontend | React 18 · Vite 5 · TypeScript · Ant Design 5 · axios · react-router 6 |
| Build & deploy | Maven multi-module · Docker (middleware) · JDK 17 |

---

## Modules & Ports

| Module | Port | Responsibility | Database |
|---|---|---|---|
| `hm-gateway` | **8080** | Unified entry point: routing, JWT authentication, whitelist, user-identity propagation | — |
| `item-service` | 8081 | Products: paging/search, CRUD, listing on/off shelf, stock deduction and rollback | `hm-item` |
| `cart-service` | 8082 | Cart: add item, update quantity, remove, select items, my cart | `hm-cart` |
| `user-service` | 8084 | Users: login, account info, address book, balance (top-up / deduction) | `hm-user` |
| `trade-service` | 8085 | Orders: order placement, order queries, payment-status sync, timeout closure | `hm-trade` |
| `pay-service` | 8086 | Payments: payment order creation, balance payment, payment-success notification | `hm-pay` |
| `hm-common` | — | Shared module: unified response `R`, exception hierarchy and global exception handling, user context, pagination, MQ configuration, auto-configuration | — |
| `hm-api` | — | Shared contracts: Feign clients, DTOs, Feign interceptor and fallback factories | — |
| `hm-service` | 8080 | Legacy monolith (port conflicts with the gateway; not started by default) | `hmall` |
| `hmall-web` | 5173 | Frontend (Vite dev server, `/api` proxied to the gateway) | — |

Middleware ports:

| Middleware | Port | Notes |
|---|---|---|
| Nacos | 8848 | Service discovery + config center (including the shared config `shared-seata.yaml`) |
| MySQL | **3307** | Username `root`; password configured in the local profile |
| Redis | 6379 | Caching |
| RabbitMQ | 5672 / 15672 | Username `itheima`, vhost `/`; the `x-delayed-message` plugin is required |
| Seata Server | 8099 (console 7099) | Transaction coordinator, registered to Nacos, transaction group `hmall` |
| Sentinel Dashboard | 8090 | Already referenced by cart-service |

---

## Features

**User side**

- Home carousel, product search (keyword / category / brand / price range + sorting + pagination), product detail
- Cart: add to cart, change quantity, remove, select for checkout
- Order placement: choose a shipping address on the confirmation page and create an order (cross-service: clear the cart + deduct stock)
- Payment: balance payment, payment success updates the order status
- Orders: my orders (filter by status, paginated), order detail, go to payment
- Account: user information, balance view and top-up
- Address book: create / update / delete / set as default (address picking via Google Maps Places, storing the Place ID)

**Admin side**

- Product management: paginated queries, create / update / list on-off shelf / delete (including specs and stock)

---

## Getting Started

### 1. Requirements

- JDK **17**, Maven 3.9+, Node 18+, Docker (or middleware installed locally)
- Running the services in IntelliJ IDEA is recommended; Maven must be able to reach the dependency repositories

### 2. Start the middleware

Nacos, MySQL (**3307**), Redis, RabbitMQ (with the `x-delayed-message` plugin) and Seata Server.

> ⚠️ **Startup order**: Nacos → MySQL/Redis/RabbitMQ → **Seata** (Seata registers itself to Nacos on startup; if Nacos is not ready yet, Seata fails and exits).

### 3. Initialize the databases

Each service uses its own schema: `hm-item`, `hm-cart`, `hm-trade`, `hm-pay`, `hm-user`. Import the DDL and initial data scripts yourself.

### 4. Nacos configuration

- Shared config: `shared-seata.yaml` (Seata transaction group, TC address, etc.);
- Per-service config: `{service-name}.yaml` / `{service-name}-local.yaml`, containing `server.port`, datasource, RabbitMQ connection, etc.;
- `hm.db.host` / `hm.db.pw` in the local profile distinguish "running on the host" from "running in containers".

### 5. Start the services

Start them in dependency order: `item-service` / `cart-service` / `user-service` / `pay-service` / `trade-service`, then `hm-gateway` last.

**JVM arguments required on JDK 17** (otherwise MyBatis-Plus / Seata reflection fails with `InaccessibleObjectException`):

```
--add-opens java.base/java.lang=ALL-UNNAMED
--add-opens java.base/java.lang.invoke=ALL-UNNAMED
```

### 6. Start the frontend

```bash
cd hmall-web
npm install
npm run dev          # http://localhost:5173 (/api is proxied to http://localhost:8080)
```

Demo account: `Jack / 123`.

### 7. When changing queue arguments

Queue arguments take effect **only at the first declaration**. If you modify parameters such as `x-dead-letter-*`, delete the existing queues before starting the services; otherwise the listener containers fail to start with
`PRECONDITION_FAILED - inequivalent arg ...`:

```
Management UI http://localhost:15672 → Queues → delete trade.delay.order.queue / trade.pay.success.queue
```
