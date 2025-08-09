import { BaseTool } from "./base-tool.js";
import { writeFileWithMetadata } from "../utils/file-utils.js";
import { FILE_ENCODINGS } from "../config/constants.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export class FileWriteTool extends BaseTool {
  constructor() {
    super(
      "file_write",
      "Write content to a file with metadata - safer than shell redirection",
      {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "Path to the file to write (absolute or relative)",
          },
          content: {
            type: "string",
            description: "Content to write to the file",
          },
          encoding: {
            type: "string",
            description: "File encoding (default: utf8)",
            enum: FILE_ENCODINGS,
          },
          create_directories: {
            type: "boolean",
            description: "Create parent directories if they don't exist (default: false)",
          },
          backup: {
            type: "boolean",
            description: "Create a backup of existing file before overwriting (default: false)",
          },
        },
        required: ["file_path", "content"],
      }
    );
  }

  async run(args) {
    const { 
      file_path, 
      content, 
      encoding = 'utf8', 
      create_directories = false,
      backup = false 
    } = args;
    
    if (!file_path || typeof file_path !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, "file_path must be a non-empty string");
    }

    if (content === undefined || content === null) {
      throw new McpError(ErrorCode.InvalidParams, "content is required");
    }

    // Convert content to string if it isn't already
    const stringContent = typeof content === 'string' ? content : String(content);

    try {
      let backupInfo = null;
      
      // Create backup if requested and file exists
      if (backup) {
        backupInfo = await this.createBackup(file_path);
      }

      const result = writeFileWithMetadata(file_path, stringContent, {
        encoding,
        create_directories
      });
      
      return {
        operation: 'file_write',
        ...result,
        backup_created: backupInfo,
        content_preview: this.createContentPreview(stringContent),
      };
    } catch (error) {
      // Convert filesystem errors to structured format
      if (error.code === 'ENOENT') {
        if (error.message.includes('directory')) {
          throw new McpError(ErrorCode.InvalidParams, `Parent directory does not exist: ${file_path}. Use create_directories: true to create it.`);
        } else {
          throw new McpError(ErrorCode.InvalidParams, `Path not found: ${file_path}`);
        }
      } else if (error.code === 'EACCES') {
        throw new McpError(ErrorCode.InvalidParams, `Permission denied: ${file_path}`);
      } else if (error.code === 'EISDIR') {
        throw new McpError(ErrorCode.InvalidParams, `Path is a directory: ${file_path}`);
      } else if (error.code === 'ENOSPC') {
        throw new McpError(ErrorCode.InvalidParams, `No space left on device: ${file_path}`);
      } else {
        throw error;
      }
    }
  }

  async createBackup(filePath) {
    try {
      const { existsSync } = await import("fs");
      const { copyFileSync } = await import("fs");
      const { validateAndNormalizePath } = await import("../utils/file-utils.js");
      
      const normalizedPath = validateAndNormalizePath(filePath);
      
      if (!existsSync(normalizedPath)) {
        return null; // No backup needed if file doesn't exist
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${normalizedPath}.backup-${timestamp}`;
      
      copyFileSync(normalizedPath, backupPath);
      
      return {
        backup_created: true,
        backup_path: backupPath,
        timestamp
      };
    } catch (error) {
      return {
        backup_created: false,
        error: error.message
      };
    }
  }

  createContentPreview(content, maxLength = 200) {
    const lines = content.split('\n');
    const totalLines = lines.length;
    
    if (content.length <= maxLength) {
      return {
        preview: content,
        truncated: false,
        total_length: content.length,
        total_lines: totalLines
      };
    }

    // Try to show complete lines if possible
    let preview = '';
    let lineCount = 0;
    
    for (const line of lines) {
      if (preview.length + line.length + 1 > maxLength) {
        break;
      }
      preview += (preview ? '\n' : '') + line;
      lineCount++;
    }

    // If we couldn't fit any complete lines, just truncate
    if (preview.length === 0) {
      preview = content.substring(0, maxLength - 3) + '...';
    } else if (lineCount < totalLines) {
      preview += '\n...';
    }

    return {
      preview,
      truncated: content.length > maxLength,
      total_length: content.length,
      total_lines: totalLines,
      preview_lines: lineCount
    };
  }
}