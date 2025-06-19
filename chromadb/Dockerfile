FROM node:18

# Install system dependencies including Python
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Copy Python MCP server files
COPY mcp-server/ ./mcp-server/

# Create virtual environment and install Python dependencies for MCP server
RUN cd mcp-server && python3 -m venv venv && \
    . venv/bin/activate && \
    pip install -r requirements.txt

# Create non-root user
RUN groupadd -g 1001 nodejs
RUN useradd -r -u 1001 -g nodejs nodejs

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose the HTTP server port
EXPOSE 8002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8002/health || exit 1

# Start the HTTP wrapper
CMD ["npm", "start"]
