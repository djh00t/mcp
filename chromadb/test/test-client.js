#!/usr/bin/env node

/**
 * Test client for the ChromaDB MCP HTTP/SSE server
 * This demonstrates how to connect to and interact with the server
 */

import fetch from 'node-fetch';
import { EventSource } from 'eventsource';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8002';

class ChromaDBMCPClient {
    constructor(serverUrl = MCP_SERVER_URL) {
        this.serverUrl = serverUrl;
        this.eventSource = null;
        this.sessionId = null;
        this.messageId = 1;
        this.connected = false;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'send' ? '📤' : type === 'receive' ? '📥' : 'ℹ️';
        console.log(`[${timestamp}] ${emoji} ${message}`);
    }

    async healthCheck() {
        try {
            const response = await fetch(`${this.serverUrl}/health`);
            const health = await response.json();
            this.log(`Health check: ${health.status}, ${health.activeSessions} active sessions`);
            return health;
        } catch (error) {
            this.log(`Health check failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async connect() {
        if (this.eventSource) {
            this.log('Already connected', 'error');
            return;
        }

        return new Promise((resolve, reject) => {
            this.log('🔌 Connecting to MCP server via SSE...');
            this.eventSource = new EventSource(`${this.serverUrl}/mcp`);

            const timeout = setTimeout(() => {
                this.log('Connection timeout', 'error');
                this.disconnect();
                reject(new Error('Connection timeout'));
            }, 10000);

            this.eventSource.onopen = () => {
                this.log('SSE connection opened', 'success');
            };

            this.eventSource.addEventListener('connected', (event) => {
                clearTimeout(timeout);
                const data = JSON.parse(event.data);
                this.sessionId = data.sessionId;
                this.connected = true;
                this.log(`Connected with session ID: ${this.sessionId}`, 'success');
                resolve(this.sessionId);
            });

            this.eventSource.addEventListener('message', (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'stdout') {
                    try {
                        const mcpMessage = JSON.parse(data.content);
                        this.log(`MCP Response: ${JSON.stringify(mcpMessage, null, 2)}`, 'receive');
                    } catch (e) {
                        this.log(`MCP stdout: ${data.content}`, 'receive');
                    }
                } else if (data.type === 'stderr') {
                    this.log(`MCP stderr: ${data.content}`);
                }
            });

            this.eventSource.addEventListener('close', (event) => {
                const data = JSON.parse(event.data);
                this.log(`MCP process closed with code: ${data.code}`, 'error');
                this.connected = false;
            });

            this.eventSource.addEventListener('error', (event) => {
                const data = JSON.parse(event.data);
                this.log(`MCP process error: ${data.error}`, 'error');
                this.connected = false;
            });

            this.eventSource.onerror = (error) => {
                clearTimeout(timeout);
                this.log(`SSE error: ${error}`, 'error');
                this.connected = false;
                reject(error);
            };
        });
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            this.sessionId = null;
            this.connected = false;
            this.log('Disconnected from MCP server', 'success');
        }
    }

    async sendMessage(message) {
        if (!this.sessionId) {
            throw new Error('Not connected to MCP server');
        }

        try {
            const response = await fetch(`${this.serverUrl}/mcp/${this.sessionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message })
            });

            const result = await response.json();
            if (result.success) {
                this.log(`Message sent: ${JSON.stringify(message)}`, 'send');
                return result;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.log(`Error sending message: ${error.message}`, 'error');
            throw error;
        }
    }

    async initialize() {
        const initMessage = {
            jsonrpc: "2.0",
            id: this.messageId++,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {
                    roots: {
                        listChanged: true
                    }
                },
                clientInfo: {
                    name: "chromadb-mcp-test-client",
                    version: "1.0.0"
                }
            }
        };
        return await this.sendMessage(initMessage);
    }

    async listTools() {
        const toolsMessage = {
            jsonrpc: "2.0",
            id: this.messageId++,
            method: "tools/list"
        };
        return await this.sendMessage(toolsMessage);
    }

    async createCollection(name, embeddingFunction = "default") {
        const message = {
            jsonrpc: "2.0",
            id: this.messageId++,
            method: "tools/call",
            params: {
                name: "chroma_create_collection",
                arguments: {
                    collection_name: name,
                    embedding_function: embeddingFunction
                }
            }
        };
        return await this.sendMessage(message);
    }

    async listCollections() {
        const message = {
            jsonrpc: "2.0",
            id: this.messageId++,
            method: "tools/call",
            params: {
                name: "chroma_list_collections"
            }
        };
        return await this.sendMessage(message);
    }

    async addDocuments(collectionName, documents, metadata = null, ids = null) {
        const message = {
            jsonrpc: "2.0",
            id: this.messageId++,
            method: "tools/call",
            params: {
                name: "chroma_add_documents",
                arguments: {
                    collection_name: collectionName,
                    documents: documents,
                    ...(metadata && { metadata }),
                    ...(ids && { ids })
                }
            }
        };
        return await this.sendMessage(message);
    }

    async queryCollection(collectionName, queryTexts, nResults = 10) {
        const message = {
            jsonrpc: "2.0",
            id: this.messageId++,
            method: "tools/call",
            params: {
                name: "chroma_query_collection",
                arguments: {
                    collection_name: collectionName,
                    query_texts: queryTexts,
                    n_results: nResults
                }
            }
        };
        return await this.sendMessage(message);
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

async function runDemo() {
    const client = new ChromaDBMCPClient();

    try {
        console.log('🚀 Starting ChromaDB MCP Client Demo\n');

        // Health check
        console.log('1️⃣ Checking server health...');
        await client.healthCheck();
        await client.sleep(1000);

        // Connect
        console.log('\n2️⃣ Connecting to MCP server...');
        await client.connect();
        await client.sleep(2000);

        // Initialize
        console.log('\n3️⃣ Initializing MCP session...');
        await client.initialize();
        await client.sleep(2000);

        // List tools
        console.log('\n4️⃣ Listing available tools...');
        await client.listTools();
        await client.sleep(2000);

        // List collections
        console.log('\n5️⃣ Listing existing collections...');
        await client.listCollections();
        await client.sleep(2000);

        // Create a test collection
        console.log('\n6️⃣ Creating test collection...');
        const collectionName = `test_collection_${Date.now()}`;
        await client.createCollection(collectionName);
        await client.sleep(2000);

        // Add some documents
        console.log('\n7️⃣ Adding test documents...');
        const documents = [
            "The quick brown fox jumps over the lazy dog",
            "ChromaDB is a vector database for AI applications",
            "Model Context Protocol enables seamless integration"
        ];
        const metadata = [
            { category: "example", type: "pangram" },
            { category: "tech", type: "database" },
            { category: "tech", type: "protocol" }
        ];
        await client.addDocuments(collectionName, documents, metadata);
        await client.sleep(2000);

        // Query the collection
        console.log('\n8️⃣ Querying the collection...');
        await client.queryCollection(collectionName, ["vector database"], 2);
        await client.sleep(2000);

        console.log('\n✅ Demo completed successfully!');

    } catch (error) {
        console.error('\n❌ Demo failed:', error.message);
    } finally {
        console.log('\n🔌 Disconnecting...');
        client.disconnect();
        // Give a moment for cleanup
        setTimeout(() => process.exit(0), 1000);
    }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runDemo().catch(console.error);
}

export default ChromaDBMCPClient;
