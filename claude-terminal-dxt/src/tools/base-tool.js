import { performance } from "perf_hooks";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export class BaseTool {
  constructor(name, description, inputSchema) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
  }

  getDefinition() {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
    };
  }

  async execute(args) {
    const startTime = performance.now();
    
    try {
      const result = await this.run(args);
      const executionTime = Math.round(performance.now() - startTime);
      
      return this.formatSuccess(result, executionTime);
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      
      if (error instanceof McpError) {
        throw error;
      }
      
      return this.formatError(error, executionTime);
    }
  }

  async run(args) {
    throw new Error("run() method must be implemented by subclass");
  }

  formatSuccess(result, executionTime) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            execution_time_ms: executionTime,
            ...result,
          }, null, 2),
        },
      ],
    };
  }

  formatError(error, executionTime) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            execution_time_ms: executionTime,
            error: error.message,
            ...(error.stdout && { stdout: error.stdout.toString() }),
            ...(error.stderr && { stderr: error.stderr.toString() }),
            ...(error.code && { exit_code: error.code }),
            ...(error.signal && { signal: error.signal }),
            ...(error.killed && { timeout: true }),
          }, null, 2),
        },
      ],
    };
  }

  validateArgs(args, required = []) {
    for (const field of required) {
      if (!args[field]) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Missing required parameter: ${field}`
        );
      }
    }
  }
}