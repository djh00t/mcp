.PHONY: help build up down logs test clean install dev

# Default target
help:
	@echo "ChromaDB MCP HTTP/SSE Server"
	@echo ""
	@echo "Available commands:"
	@echo "  make install    - Install Node.js dependencies"
	@echo "  make build      - Build Docker images"
	@echo "  make up         - Start services with Docker Compose"
	@echo "  make down       - Stop services"
	@echo "  make logs       - View service logs"
	@echo "  make test       - Run test client"
	@echo "  make dev        - Run in development mode"
	@echo "  make clean      - Clean up Docker resources"
	@echo "  make health     - Check service health"

# Install dependencies
install:
	npm install

# Build Docker images
build:
	docker compose build

# Start services
up:
	docker compose up -d

# Stop services
down:
	docker compose down

# View logs
logs:
	docker compose logs -f

# Run test client
test: install
	npm test

# Development mode (run wrapper locally)
dev: install
	npm run dev

# Clean up Docker resources
clean:
	docker compose down -v --remove-orphans
	docker system prune -f

# Health check
health:
	@echo "Checking service health..."
	@curl -s http://localhost:8002/health | jq . || echo "❌ HTTP service not responding"
	@curl -s http://localhost:8003/api/v2/heartbeat && echo "✅ ChromaDB responding" || echo "❌ ChromaDB not responding"

# Quick start (install, build, and run)
start: install build up
	@echo "🚀 Services starting..."
	@sleep 5
	@make health
