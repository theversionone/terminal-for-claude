import { BaseTool } from "./base-tool.js";
import { execAsync, getExecOptions } from "../utils/command-utils.js";
import { SCRIPT_EXTENSIONS, SCRIPT_COMMANDS, TIMEOUTS } from "../config/constants.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export class ExecuteScriptTool extends BaseTool {
  constructor() {
    super(
      "execute_script",
      "Execute a script with specified interpreter",
      {
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
      }
    );
  }

  async run(args) {
    const { script_content, interpreter, working_directory, timeout = TIMEOUTS.SCRIPT } = args;
    
    if (!script_content || typeof script_content !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, "Script content must be a non-empty string");
    }

    let tempFile = null;

    try {
      // Create temporary file for script
      const tempDir = mkdtempSync(join(tmpdir(), 'claude-terminal-'));
      const extension = SCRIPT_EXTENSIONS[interpreter] || '.txt';
      tempFile = join(tempDir, `script${extension}`);
      
      writeFileSync(tempFile, script_content, 'utf8');

      // Build command based on interpreter
      const command = this.buildScriptCommand(interpreter, tempFile);
      
      const execOptions = getExecOptions({
        timeout,
        working_directory,
      });

      const { stdout, stderr } = await execAsync(command, execOptions);

      return {
        interpreter,
        working_directory: working_directory || process.cwd(),
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exit_code: 0,
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

  buildScriptCommand(interpreter, scriptPath) {
    const commandBuilder = SCRIPT_COMMANDS[interpreter];
    
    if (!commandBuilder) {
      throw new McpError(ErrorCode.InvalidParams, `Unsupported interpreter: ${interpreter}`);
    }
    
    return commandBuilder(scriptPath);
  }
}