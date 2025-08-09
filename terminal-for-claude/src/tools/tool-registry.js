import { ExecuteCommandTool } from "./execute-command.js";
import { ExecuteScriptTool } from "./execute-script.js";
import { SystemInfoTool } from "./system-info.js";
import { ListProcessesTool, KillProcessTool } from "./process-manager.js";
import { FileReadTool } from "./file-read.js";
import { FileWriteTool } from "./file-write.js";
import { FileOperationsTool } from "./file-operations.js";
import { DirectoryOperationsTool } from "./directory-operations.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.registerDefaultTools();
  }

  registerDefaultTools() {
    // Register all built-in tools
    this.register(new ExecuteCommandTool());
    this.register(new ExecuteScriptTool());
    this.register(new SystemInfoTool());
    this.register(new ListProcessesTool());
    this.register(new KillProcessTool());
    
    // Register file operation tools
    this.register(new FileReadTool());
    this.register(new FileWriteTool());
    this.register(new FileOperationsTool());
    this.register(new DirectoryOperationsTool());
  }

  register(tool) {
    if (!tool.name || !tool.execute) {
      throw new Error("Tool must have a name and execute method");
    }
    
    this.tools.set(tool.name, tool);
    console.error(`Registered tool: ${tool.name}`);
  }

  unregister(toolName) {
    return this.tools.delete(toolName);
  }

  get(toolName) {
    return this.tools.get(toolName);
  }

  has(toolName) {
    return this.tools.has(toolName);
  }

  list() {
    return Array.from(this.tools.values()).map(tool => tool.getDefinition());
  }

  async execute(toolName, args) {
    const tool = this.get(toolName);
    
    if (!tool) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${toolName}`
      );
    }

    return await tool.execute(args);
  }

  // Method to add custom tools dynamically
  addCustomTool(toolClass) {
    const tool = new toolClass();
    this.register(tool);
    return tool;
  }

  // Get all tool names
  getToolNames() {
    return Array.from(this.tools.keys());
  }

  // Get tool count
  size() {
    return this.tools.size;
  }

  // Clear all tools (useful for testing)
  clear() {
    this.tools.clear();
  }

  // Re-initialize with default tools
  reset() {
    this.clear();
    this.registerDefaultTools();
  }
}