# ⚙️ stexs-core (Node.js Iteration)

> ⚠️ **Notice:** This version of STEXS is no longer under active development.  
> A complete rewrite is underway using **Rust**, with a focus on **low-latency**, **global distribution**, and **next-gen performance architecture**.

---

## 🔧 About This Iteration

This is the **third iteration** of the STEXS platform, built in **Node.js + TypeScript**, designed as a scalable backend foundation. It includes:

- Custom **Authentication API**
- Modular **User Services**: profiles, friends, blocks
- **Inventory system**
- **Notifications layer** using PostgreSQL & PostgREST
- **File API** (S3-compatible): avatars, item assets, organization images
- Dev environment built with **Docker**
- Internal **event service** for actions like sending emails

---

## 📡 Architecture Overview

This iteration is built with scalability in mind:

- **Queue Service** for event-driven logic
- **PostgreSQL** as the primary data layer
- **PostgREST** to expose structured, typed data APIs
- **S3-compatible file API** for media management
- **Email event system** via message passing
- Modular service structure for APIs

---

## 📉 Deprecation Plan & Future Direction

The next version of STEXS will be rewritten from the ground up in **Rust**, with emphasis on:

- ✅ **gRPC with FlatBuffers** as the primary protocol
- ✅ Fallback support for **ProtoBuf** and **JSON** via `Accept` header negotiation
- ✅ **Pingora-based Load Balancer** to act as an intelligent API edge
- ✅ **YugabyteDB** for distributed global data storage
- ✅ **Garnet** for ultra-fast cache and object storage
- ✅ **Pulsar** for event streaming and messaging
- ✅ **ClickHouse** for analytics: user behavior, game data, API usage

---

## 🧪 Current Features (Node.js Iteration)

| Feature               | Status       | Notes                                         |
|-----------------------|--------------|-----------------------------------------------|
| Auth API              | ✅ Complete   | Full session/token handling, secure cookies   |
| User Profiles         | ✅ Complete   | Includes friends, block system                |
| Inventory             | ✅ Complete   | Schema in place, logic under construction     |
| Notifications         | ✅ Complete   | Via Postgres triggers & PostgREST             |
| File Upload API       | ✅ Complete   | Avatar, item, org assets (S3-compatible)      |
| Event Service (Emails)| ✅ Complete   | Sends transactional emails on user actions    |
| Docker Environment    | ✅ Complete   | Dev-ready with multiple services              |

---

## 🧭 Roadmap to Rust

The current Node.js system served as a development foundation.  
The next version is a full Rust rewrite focused on **edge performance**, **binary protocols**, and **global distribution** — eliminating REST entirely.

### 🔁 Planned Replacements

| Current Stack           | Rust-Based Replacement                                                  |
|-------------------------|-------------------------------------------------------------------------|
| `Node.js`               | [`Rust`](https://www.rust-lang.org/) with low-level async services using [`Tokio`](https://tokio.rs/)     |
| `PostgreSQL`            | [`YugabyteDB`](https://github.com/yugabyte/yugabyte-db) — globally distributed SQL |
| `REST APIs (JSON)`      | **gRPC over FlatBuffers** with `Accept`-header fallback (ProtoBuf/JSON) |
| `Kong`                       | [`Pingora`](https://github.com/cloudflare/pingora) as edge load balancer |

---

### 🔐 Pingora as the Protocol-Aware Edge

The **Pingora-based load balancer** will handle:

- ✅ **Protocol negotiation** (FlatBuffers, ProtoBuf, JSON) via `Accept` headers
- ✅ **Request validation** and schema enforcement
- ✅ **Rate limiting** and abuse protection
- ✅ **JWT decoding + invalidation**
- ✅ **Auth checks** before requests reach backend services
- ✅ **Metering** for usage tracking and analytics
- ✅ **Edge-side response formatting** (converting FlatBuffer responses to JSON)

> 🛰️ This ensures every request is efficiently handled near the user — without unnecessary backend overhead.

---

### 🧩 Protocol Strategy

- 🧱 Default: **gRPC + FlatBuffers**
- 🛠️ Fallback: **ProtoBuf** or **JSON**, based on `Accept` headers
- 🔀 **Pingora** negotiates and transforms responses at the edge, with no REST endpoints required

---

### 🐳 Dev Environment

To get started with local development:

1. **Install prerequisites**:
   - [Node.js](https://nodejs.org/) version **22 or higher**
   - [pnpm](https://pnpm.io/) package manager (`npm i -g pnpm`)
   - [Docker](https://www.docker.com/) & Docker Compose

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Start the development containers**:
   ```bash
   docker compose up -d
   ```

5. **Access the API**:
   - **Auth and Storage API**: http://localhost:8000/api/v1
   - **Rest API (PostgREST)**: http://localhost:8000/rest/v1

---

### 🪪 License

This project is licensed under the MIT License.
