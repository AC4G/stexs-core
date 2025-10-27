# stexs-core (Node.js Iteration)

> **Notice:** This version of STEXS is no longer under active development.  
> A complete rewrite is underway using **Rust**, with a focus on **low-latency**, **global distribution**, and **next-gen performance architecture**.

## About This Iteration

This is the **third iteration** of the STEXS platform, built in **Node.js + TypeScript**, designed as a scalable backend foundation. It includes:

- Custom **Authentication API**
- Modular **User Services**: profiles, friends, blocks
- **Inventory system**
- **Notifications layer** using PostgreSQL & PostgREST
- **File API** (S3-compatible): avatars, item assets, organization images
- Dev environment built with **Docker**
- Internal **event service** for actions like sending emails

## Architecture Overview

This iteration is built with scalability in mind:

- **Queue Service** for event-driven logic
- **PostgreSQL** as the primary data layer
- **PostgREST** to expose structured, typed data APIs
- **S3-compatible file API** for media management
- **Email event system** via message passing
- Modular service structure for APIs

## Deprecation Plan & Future Direction

The next version of STEXS will be rewritten from the ground up in **Rust**, with emphasis on:

- **gRPC with FlatBuffers** as the primary protocol
- Fallback support for **ProtoBuf** and **JSON** via `Accept` header negotiation
- **Pingora-based Load Balancer** to act as an intelligent API edge
- **YugabyteDB** for distributed global data storage
- **Garnet** for ultra-fast cache and object storage
- **Pulsar** for event streaming and messaging
- **ClickHouse** for analytics: user behavior, game data, API usage

### Dev Environment

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

5. **Start the development server**:
   ```bash
   pnpm dev
   ```

6. **Access the API**:
   - **Auth and Storage API**: http://localhost:8000/api/v1
   - **Rest API (PostgREST)**: http://localhost:8000/rest/v1

# License

This project is licensed under the MIT License.
