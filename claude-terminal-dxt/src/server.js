#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir, platform, arch, release, type, cpus, homedir } from "os";
import { performance } from "perf_hooks";

const execAsync = promisify(exec);

class TerminalServer {
  constructor() {
    this.server = new Server(
      {
        name: "claude-terminal",
        version: "1.0.0",
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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "execute_command",
            description: "Execute a shell command in the terminal with proper security and timeout handling",
            inputSchema: {
              type: "object",
              properties: {
                command: {
                  type: "string",
                  description: "The command to execute",
                },
                working_directory: {
                  type: "string",
                  description: "Optional working directory for command execution",
                },
                timeout: {
                  type: "number",
                  description: "Optional timeout in milliseconds (default: 30000, max: 300000)",
                  minimum: 1000,
                  maximum: 300000,
                },
                environment: {
                  type: "object",
                  description: "Optional environment variables",
                },
              },
              required: ["command"],
            },
          },
          {
            name: "execute_script",
            description: "Execute a script with specified interpreter",
            inputSchema: {
              type: "object",
              properties: {
                script_content: {
                  type: "string",
                  description: "The script content to execute",
                },
                interpreter: {
                  type: "string",
                  description: "Script interpreter (bash, powershell, python, node, etc.)",
                  enum: ["bash", "sh", "powershell", "cmd", "python", "python3", "node", "perl", "ruby"],
                },
                working_directory: {
                  type: "string",
                  description: "Optional working directory for script execution",
                },
                timeout: {
                  type: "number",
                  description: "Optional timeout in milliseconds (default: 60000)",
                  minimum: 1000,
                  maximum: 300000,
                },
              },
              required: ["script_content", "interpreter"],
            },
          },
          {
            name: "get_system_info",
            description: "Get comprehensive system information",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "list_processes",
            description: "List running processes with filtering options",
            inputSchema: {
              type: "object",
              properties: {
                filter: {
                  type: "string",
                  description: "Optional filter for process names (regex supported)",
                },
                limit: {
                  type: "number",
                  description: "Optional limit for number of processes returned (default: 50)",
                  minimum: 1,
                  maximum: 500,
                },
              },
            },
          },
          {
            name: "kill_process",
            description: "Terminate a process by PID with safety checks",
            inputSchema: {
              type: "object",
              properties: {
                pid: {
                  type: "number",
                  description: "Process ID to terminate",
                  minimum: 1,
                },
                force: {
                  type: "boolean",
                  description: "Force kill the process (default: false)",
                },
                signal: {
                  type: "string",
                  description: "Signal to send (SIGTERM, SIGKILL, etc.)",
                  enum: ["SIGTERM", "SIGKILL", "SIGINT", "SIGHUP", "SIGQUIT"],
                },
              },
              required: ["pid"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case "execute_command":
            return await this.executeCommand(args);
          case "execute_script":
            return await this.executeScript(args);
          case "get_system_info":
            return await this.getSystemInfo(args);
          case "list_processes":
            return await this.listProcesses(args);
          case "kill_process":
            return await this.killProcess(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
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

  async executeCommand(args) {
    const { command, working_directory, timeout = 30000, environment = {} } = args;
    
    if (!command || typeof command !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, "Command must be a non-empty string");
    }

    const startTime = performance.now();
    
    try {
      const execOptions = {
        timeout: Math.min(timeout, 300000),
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        env: { ...process.env, ...environment },
      };

      if (working_directory) {
        execOptions.cwd = working_directory;
      }

      const { stdout, stderr } = await execAsync(command, execOptions);
      const executionTime = Math.round(performance.now() - startTime);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              command,
              working_directory: working_directory || process.cwd(),
              execution_time_ms: executionTime,
              stdout: stdout.toString(),
              stderr: stderr.toString(),
              exit_code: 0,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              command,
              working_directory: working_directory || process.cwd(),
              execution_time_ms: executionTime,
              error: error.message,
              stdout: error.stdout ? error.stdout.toString() : "",
              stderr: error.stderr ? error.stderr.toString() : "",
              exit_code: error.code || 1,
              signal: error.signal || null,
              timeout: error.killed || false,
            }, null, 2),
          },
        ],
      };
    }
  }

  async executeScript(args) {
    const { script_content, interpreter, working_directory, timeout = 60000 } = args;
    
    if (!script_content || typeof script_content !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, "Script content must be a non-empty string");
    }

    const startTime = performance.now();
    let tempFile = null;

    try {
      // Create temporary file for script
      const tempDir = mkdtempSync(join(tmpdir(), 'claude-terminal-'));
      const extension = this.getScriptExtension(interpreter);
      tempFile = join(tempDir, `script${extension}`);
      
      writeFileSync(tempFile, script_content, 'utf8');

      // Build command based on interpreter
      const command = this.buildScriptCommand(interpreter, tempFile);
      
      const execOptions = {
        timeout: Math.min(timeout, 300000),
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      };

      if (working_directory) {
        execOptions.cwd = working_directory;
      }

      const { stdout, stderr } = await execAsync(command, execOptions);
      const executionTime = Math.round(performance.now() - startTime);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              interpreter,
              working_directory: working_directory || process.cwd(),
              execution_time_ms: executionTime,
              stdout: stdout.toString(),
              stderr: stderr.toString(),
              exit_code: 0,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              interpreter,
              working_directory: working_directory || process.cwd(),
              execution_time_ms: executionTime,
              error: error.message,
              stdout: error.stdout ? error.stdout.toString() : "",
              stderr: error.stderr ? error.stderr.toString() : "",
              exit_code: error.code || 1,
              signal: error.signal || null,
              timeout: error.killed || false,
            }, null, 2),
          },
        ],
      };
    } finally {
      // Clean up temp file
      if (tempFile) {
        try {
          unlinkSync(tempFile);
        } catch (cleanupError) {
          console.error(`Failed to cleanup temp file: ${cleanupError.message}`);
        }
      }
    }
  }

  getScriptExtension(interpreter) {
    const extensions = {
      bash: '.sh',
      sh: '.sh',
      powershell: '.ps1',
      cmd: '.bat',
      python: '.py',
      python3: '.py',
      node: '.js',
      perl: '.pl',
      ruby: '.rb',
    };
    return extensions[interpreter] || '.txt';
  }

  buildScriptCommand(interpreter, scriptPath) {
    const commands = {
      bash: `bash "${scriptPath}"`,
      sh: `sh "${scriptPath}"`,
      powershell: `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`,
      cmd: `cmd /c "${scriptPath}"`,
      python: `python "${scriptPath}"`,
      python3: `python3 "${scriptPath}"`,
      node: `node "${scriptPath}"`,
      perl: `perl "${scriptPath}"`,
      ruby: `ruby "${scriptPath}"`,
    };
    
    if (!commands[interpreter]) {
      throw new McpError(ErrorCode.InvalidParams, `Unsupported interpreter: ${interpreter}`);
    }
    
    return commands[interpreter];
  }

  async getSystemInfo() {
    const startTime = performance.now();
    
    try {
      const systemInfo = {
        platform: platform(),
        architecture: arch(),
        release: release(),
        type: type(),
        node_version: process.version,
        uptime: Math.round(process.uptime()),
        memory: process.memoryUsage(),
        cpu_count: cpus().length,
        home_directory: homedir(),
        temp_directory: tmpdir(),
        current_working_directory: process.cwd(),
        environment_variables: Object.keys(process.env).length,
        timestamp: new Date().toISOString(),
      };

      const executionTime = Math.round(performance.now() - startTime);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              execution_time_ms: executionTime,
              system_info: systemInfo,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              execution_time_ms: executionTime,
              error: error.message,
            }, null, 2),
          },
        ],
      };
    }
  }

  async listProcesses(args) {
    const { filter, limit = 50 } = args;
    const startTime = performance.now();

    try {
      let command;
      if (platform() === 'win32') {
        command = 'tasklist /FO CSV';
      } else {
        command = 'ps aux';
      }

      const { stdout } = await execAsync(command, {
        timeout: 10000,
        maxBuffer: 1024 * 1024 * 5, // 5MB buffer
      });

      let processes = this.parseProcessList(stdout, platform() === 'win32');
      
      if (filter) {
        const regex = new RegExp(filter, 'i');
        processes = processes.filter(proc => regex.test(proc.name));
      }

      processes = processes.slice(0, Math.min(limit, 500));
      
      const executionTime = Math.round(performance.now() - startTime);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              execution_time_ms: executionTime,
              process_count: processes.length,
              processes,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              execution_time_ms: executionTime,
              error: error.message,
            }, null, 2),
          },
        ],
      };
    }
  }

  parseProcessList(stdout, isWindows) {
    const lines = stdout.trim().split('\n');
    const processes = [];

    if (isWindows) {
      // Skip header line for Windows tasklist
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(part => part.replace(/"/g, ''));
        if (parts.length >= 2) {
          processes.push({
            name: parts[0],
            pid: parseInt(parts[1]) || 0,
            memory: parts[4] || 'N/A',
          });
        }
      }
    } else {
      // Skip header line for Unix ps
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 11) {
          processes.push({
            user: parts[0],
            pid: parseInt(parts[1]) || 0,
            cpu: parts[2],
            memory: parts[3],
            name: parts.slice(10).join(' '),
          });
        }
      }
    }

    return processes;
  }

  async killProcess(args) {
    const { pid, force = false, signal = 'SIGTERM' } = args;
    const startTime = performance.now();

    if (!pid || typeof pid !== 'number' || pid < 1) {
      throw new McpError(ErrorCode.InvalidParams, "PID must be a positive number");
    }

    try {
      let command;
      if (platform() === 'win32') {
        command = force ? `taskkill /F /PID ${pid}` : `taskkill /PID ${pid}`;
      } else {
        const killSignal = force ? 'SIGKILL' : signal;
        command = `kill -${killSignal} ${pid}`;
      }

      const { stdout, stderr } = await execAsync(command, {
        timeout: 5000,
      });

      const executionTime = Math.round(performance.now() - startTime);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              execution_time_ms: executionTime,
              pid,
              signal: force ? 'SIGKILL' : signal,
              stdout: stdout.toString(),
              stderr: stderr.toString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              execution_time_ms: executionTime,
              pid,
              error: error.message,
              stdout: error.stdout ? error.stdout.toString() : "",
              stderr: error.stderr ? error.stderr.toString() : "",
            }, null, 2),
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Claude Terminal MCP Server running on stdio");
  }
}

const server = new TerminalServer();
server.run().catch(console.error);