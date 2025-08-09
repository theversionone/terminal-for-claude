import { BaseTool } from "./base-tool.js";
import { execAsync, getExecOptions } from "../utils/command-utils.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export class ExecuteCommandTool extends BaseTool {
  constructor() {
    super(
      "execute_command",
      "Execute a shell command in the terminal with proper security and timeout handling",
      {
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
      }
    );
  }

  async run(args) {
    const { command, working_directory, timeout, environment } = args;
    
    if (!command || typeof command !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, "Command must be a non-empty string");
    }

    const execOptions = getExecOptions({
      timeout,
      working_directory,
      environment,
    });

    const { stdout, stderr } = await execAsync(command, execOptions);

    return {
      command,
      working_directory: working_directory || process.cwd(),
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      exit_code: 0,
    };
  }
}