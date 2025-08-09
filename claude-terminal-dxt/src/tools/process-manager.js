import { BaseTool } from "./base-tool.js";
import { execAsync } from "../utils/command-utils.js";
import { isWindows } from "../utils/command-utils.js";
import { PROCESS_LIMITS, TIMEOUTS } from "../config/constants.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export class ListProcessesTool extends BaseTool {
  constructor() {
    super(
      "list_processes",
      "List running processes with filtering options",
      {
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
      }
    );
  }

  async run(args) {
    const { filter, limit = PROCESS_LIMITS.DEFAULT_LIMIT } = args;

    const command = isWindows() ? 'tasklist /FO CSV' : 'ps aux';

    const { stdout } = await execAsync(command, {
      timeout: TIMEOUTS.PROCESS,
      maxBuffer: 1024 * 1024 * 5, // 5MB buffer
    });

    let processes = this.parseProcessList(stdout, isWindows());
    
    if (filter) {
      const regex = new RegExp(filter, 'i');
      processes = processes.filter(proc => regex.test(proc.name));
    }

    processes = processes.slice(0, Math.min(limit, PROCESS_LIMITS.MAX_LIMIT));

    return {
      process_count: processes.length,
      processes,
    };
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
}

export class KillProcessTool extends BaseTool {
  constructor() {
    super(
      "kill_process",
      "Terminate a process by PID with safety checks",
      {
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
      }
    );
  }

  async run(args) {
    const { pid, force = false, signal = 'SIGTERM' } = args;

    if (!pid || typeof pid !== 'number' || pid < 1) {
      throw new McpError(ErrorCode.InvalidParams, "PID must be a positive number");
    }

    let command;
    if (isWindows()) {
      command = force ? `taskkill /F /PID ${pid}` : `taskkill /PID ${pid}`;
    } else {
      const killSignal = force ? 'SIGKILL' : signal;
      command = `kill -${killSignal} ${pid}`;
    }

    const { stdout, stderr } = await execAsync(command, {
      timeout: TIMEOUTS.KILL,
    });

    return {
      pid,
      signal: force ? 'SIGKILL' : signal,
      stdout: stdout.toString(),
      stderr: stderr.toString(),
    };
  }
}