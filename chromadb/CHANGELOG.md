# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-06-19

### Added

- Initial release of ChromaDB MCP HTTP/SSE Server
- HTTP/SSE wrapper for stdio-based MCP servers
- Docker Compose setup with ChromaDB backend
- Interactive web interface for testing and demonstration
- Comprehensive Node.js test client
- Production-ready Docker containers with health checks
- Session management for multiple concurrent clients
- Real-time communication via Server-Sent Events
- Complete API documentation and examples
- Support for all ChromaDB MCP operations:
  - Collection management (create, list, delete)
  - Document operations (add, query, retrieve)
  - Metadata filtering and full-text search
  - Vector similarity search with embeddings

### Features

- 🔌 **HTTP/SSE Transport**: Convert stdio MCP to web-accessible API
- 🐳 **Docker Ready**: Containerized with docker-compose setup
- 🌐 **Web Interface**: Interactive browser-based client
- 📝 **Test Client**: Complete Node.js client library
- 🔍 **Vector Search**: ChromaDB-powered similarity search
- 📊 **Monitoring**: Health checks and session management
- 🚀 **Production Ready**: Graceful shutdown, error handling, logging

### Technical Details

- Node.js 18+ with Express.js framework
- Server-Sent Events for real-time communication
- Docker container isolation for MCP processes
- ChromaDB vector database backend
- Model Context Protocol 2024-11-05 specification
- RESTful API with JSON-RPC message passing

### Documentation

- Complete README with setup instructions
- API reference documentation
- Client library examples (Node.js and Browser)
- Docker deployment guide
- Kubernetes configuration examples
- Troubleshooting guide
