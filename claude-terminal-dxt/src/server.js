#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { ToolRegistry } from "./tools/index.js";
import { EXTENSION_NAME, EXTENSION_VERSION } from "./config/constants.js";

class TerminalServer {
  constructor() {
    this.toolRegistry = new ToolRegistry();
    
    this.server = new Server(
      {
        name: EXTENSION_NAME,
        version: EXTENSION_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.toolRegistry.list(),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        return await this.toolRegistry.execute(name, args);
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`${EXTENSION_NAME} MCP Server v${EXTENSION_VERSION} running on stdio`);
    console.error(`Loaded ${this.toolRegistry.size()} tools: ${this.toolRegistry.getToolNames().join(', ')}`);
  }
}

// Start the server
const server = new TerminalServer();
server.run().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});