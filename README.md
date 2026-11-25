# Business Process Automation System (BPAS)

A web-based business process automation platform powered by AI agents.

## Technology Stack

- Frontend: Angular + TypeScript
- Backend: Node.js + Express.js + TypeScript
- Database: PostgreSQL
- ORM: Prisma
- AI Service: Python + FastAPI
- AI Orchestration: LangGraph
- Background Jobs: Redis + BullMQ
- Automation Integration: n8n
- Vector Database: pgvector
- Deployment: Docker

## Main Features

- Workflow Management
- Business Request Management
- Task Assignment
- Approval Management
- Workflow Automation
- AI-Powered Classification
- AI Document Analysis
- Knowledge Retrieval (RAG)
- Notifications
- Audit Logs

## Project Structure

- frontend/
- backend/
- ai-service/
- automation/
- docs/

## Backend API

The backend validates its environment configuration at startup. The OpenAPI 3
specification is available at `http://localhost:5000/api/docs/openapi.json`
when the backend is running and can be imported into Swagger UI or another
OpenAPI-compatible tool. The organization list endpoint accepts `page` and
`limit` query parameters (`limit` is capped at 100).
