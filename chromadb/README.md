# ChromaDB MCP HTTP/SSE Server

A production-ready HTTP/SSE wrapper for the ChromaDB Model Context Protocol (MCP) server. This solution enables web applications and HTTP clients to interact with ChromaDB through the standardized MCP interface using HTTP and Server-Sent Events.

## 🚀 Features

- **HTTP/SSE Transport**: Convert stdio-based MCP servers to HTTP+SSE
- **Production Ready**: Docker containerized with health checks and graceful shutdown
- **Session Management**: Multiple concurrent client sessions
- **Web Interface**: Interactive web UI for testing and demonstration
- **Test Client**: Comprehensive Node.js client library
- **Vector Database**: ChromaDB backend for embeddings and similarity search
- **Real-time Communication**: Server-Sent Events for live message streaming

## 🏗️ Architecture

```
┌─────────────────┐    HTTP/SSE    ┌──────────────────┐    stdio    ┌─────────────┐
│   Web Client    │ ────────────── │  HTTP Wrapper    │ ──────────── │  MCP Server │
│   (Browser/App) │                │  (Express.js)    │              │ (ChromaDB)  │
└─────────────────┘                └──────────────────┘              └─────────────┘
                                           │                                   │
                                           │ Docker                           │
                                           ▼                                   ▼
                                    ┌─────────────┐                    ┌─────────────┐
                                    │   Docker    │                    │  ChromaDB   │
                                    │  Container  │                    │  Database   │
                                    └─────────────┘                    └─────────────┘
```

## 📦 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)

### Run with Docker Compose

```bash
# Clone and enter the directory
cd chromadb

# Start the services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Access Points

- **Web Interface**: <http://localhost:8002>
- **API Endpoint**: <http://localhost:8002/api>
- **Health Check**: <http://localhost:8002/health>
- **ChromaDB**: <http://localhost:8003>

## 🔧 API Reference

### Health Check

```bash
GET /health
```

Returns server status and active session count.

### Connect via SSE

```bash
GET /mcp
```

Establishes Server-Sent Events connection and returns a session ID.

### Send MCP Messages

```bash
POST /mcp/:sessionId
Content-Type: application/json

{
  "message": {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }
}
```

### List Active Sessions

```bash
GET /sessions
```

### Terminate Session

```bash
DELETE /mcp/:sessionId
```

## 🧪 Testing

### Run the Test Client

```bash
npm test
```

### Manual Testing with curl

```bash
# Health check
curl http://localhost:8002/health

# Start SSE connection (in one terminal)
curl -N http://localhost:8002/mcp

# Send a message (in another terminal, replace SESSION_ID)
curl -X POST http://localhost:8002/mcp/SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "jsonrpc": "2.0",
      "id": 1,
      "method": "initialize",
      "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "test", "version": "1.0.0"}
      }
    }
  }'
```

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Start ChromaDB
docker compose up chromadb -d

# Run the wrapper locally
npm run dev

# Run tests
npm test
```

### Build Docker Image

```bash
docker compose build
```

## 📝 Configuration

Environment variables:

- `HTTP_PORT`: HTTP server port (default: 8002)
- `CHROMADB_HOST`: ChromaDB hostname (default: chromadb)
- `CHROMADB_PORT`: ChromaDB port (default: 8000)
- `MCP_IMAGE`: MCP Docker image (default: mcp/chroma:latest)
- `DOCKER_NETWORK`: Docker network name (default: chromadb-mcp_default)

## 🔌 Client Libraries

### Node.js Client

```javascript
import ChromaDBMCPClient from './test/test-client.js';

const client = new ChromaDBMCPClient('http://localhost:8002');

// Connect
await client.connect();

// Initialize MCP session
await client.initialize();

// Create a collection
await client.createCollection('my_collection');

// Add documents
await client.addDocuments('my_collection', [
  'Document 1 content',
  'Document 2 content'
]);

// Query collection
await client.queryCollection('my_collection', ['search query']);

// Disconnect
client.disconnect();
```

### Browser JavaScript

```html
<!DOCTYPE html>
<html>
<head>
    <title>ChromaDB MCP Client</title>
</head>
<body>
    <script>
        // Connect via SSE
        const eventSource = new EventSource('/mcp');
        let sessionId = null;

        eventSource.addEventListener('connected', (event) => {
            const data = JSON.parse(event.data);
            sessionId = data.sessionId;
            console.log('Connected:', sessionId);
        });

        eventSource.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            console.log('Received:', data);
        });

        // Send messages
        async function sendMessage(message) {
            const response = await fetch(`/mcp/${sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            return response.json();
        }
    </script>
</body>
</html>
```

## 🚀 Production Deployment

### Docker Compose (Recommended)

```yaml
services:
  chromadb:
    image: chromadb/chroma:latest
    volumes:
      - chromadb_data:/chroma/chroma
    ports:
      - "8003:8000"
    environment:
      - IS_PERSISTENT=TRUE

  chromadb-mcp-http:
    image: your-registry/chromadb-mcp-http:latest
    ports:
      - "8002:8002"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - chromadb
    environment:
      - CHROMADB_HOST=chromadb
      - HTTP_PORT=8002

volumes:
  chromadb_data:
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chromadb-mcp-http
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chromadb-mcp-http
  template:
    metadata:
      labels:
        app: chromadb-mcp-http
    spec:
      containers:
      - name: chromadb-mcp-http
        image: your-registry/chromadb-mcp-http:latest
        ports:
        - containerPort: 8002
        env:
        - name: CHROMADB_HOST
          value: "chromadb-service"
        - name: HTTP_PORT
          value: "8002"
---
apiVersion: v1
kind: Service
metadata:
  name: chromadb-mcp-http-service
spec:
  selector:
    app: chromadb-mcp-http
  ports:
  - port: 8002
    targetPort: 8002
  type: LoadBalancer
```

## 🔍 Monitoring

### Health Checks

```bash
# Docker health check
docker compose ps

# Manual health check
curl http://localhost:8002/health
```

### Logs

```bash
# View live logs
docker compose logs -f chromadb-mcp-http

# View specific service logs
docker compose logs chromadb
```

### Metrics

The health endpoint provides:

- Server status
- Active session count
- Configuration details
- Timestamp

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

**Port already in use**

```bash
# Check what's using the port
lsof -i :8002

# Stop conflicting services
docker stop $(docker ps -q --filter "publish=8002")
```

**Docker permission denied**

```bash
# Add user to docker group
sudo usermod -aG docker $USER
```

**ChromaDB connection failed**

```bash
# Check ChromaDB is running
curl http://localhost:8003/api/v2/heartbeat

# Check network connectivity
docker network ls
docker network inspect chromadb-mcp_default
```

**MCP session timeout**

- Increase timeout in client
- Check Docker image availability
- Verify network configuration

### Debug Mode

Set environment variable for verbose logging:

```bash
DEBUG=* npm start
```

## 🔗 Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [ChromaDB](https://www.trychroma.com/)
- [MCP Servers](https://github.com/modelcontextprotocol/servers)
- [Anthropic Claude Desktop](https://claude.ai/)

---

For more information, visit the [Model Context Protocol documentation](https://modelcontextprotocol.io/introduction).
