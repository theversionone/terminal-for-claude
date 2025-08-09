import { BaseTool } from "./base-tool.js";
import { copyFile, moveFile, deleteFile } from "../utils/file-utils.js";
import { FILE_OPERATIONS } from "../config/constants.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export class FileOperationsTool extends BaseTool {
  constructor() {
    super(
      "file_operations",
      "Perform file operations (copy, move, delete) - safer than shell commands",
      {
        type: "object",
        properties: {
          operation: {
            type: "string",
            description: "Operation to perform",
            enum: [FILE_OPERATIONS.COPY, FILE_OPERATIONS.MOVE, FILE_OPERATIONS.DELETE],
          },
          source: {
            type: "string",
            description: "Source file path (required for all operations)",
          },
          destination: {
            type: "string", 
            description: "Destination file path (required for copy and move operations)",
          },
          overwrite: {
            type: "boolean",
            description: "Allow overwriting existing files (default: false)",
          },
          force: {
            type: "boolean",
            description: "Force operation even if source doesn't exist (for delete only, default: false)",
          },
        },
        required: ["operation", "source"],
      }
    );
  }

  async run(args) {
    const { operation, source, destination, overwrite = false, force = false } = args;
    
    if (!operation || !Object.values(FILE_OPERATIONS).includes(operation)) {
      throw new McpError(
        ErrorCode.InvalidParams, 
        `Invalid operation. Must be one of: ${Object.values(FILE_OPERATIONS).join(', ')}`
      );
    }

    if (!source || typeof source !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, "source must be a non-empty string");
    }

    // Validate destination for copy and move operations
    if ((operation === FILE_OPERATIONS.COPY || operation === FILE_OPERATIONS.MOVE) && 
        (!destination || typeof destination !== 'string')) {
      throw new McpError(ErrorCode.InvalidParams, `destination is required for ${operation} operation`);
    }

    try {
      let result;
      
      switch (operation) {
        case FILE_OPERATIONS.COPY:
          result = copyFile(source, destination, { overwrite });
          break;
          
        case FILE_OPERATIONS.MOVE:
          result = moveFile(source, destination, { overwrite });
          break;
          
        case FILE_OPERATIONS.DELETE:
          result = deleteFile(source, { force });
          break;
          
        default:
          throw new McpError(ErrorCode.InvalidParams, `Unsupported operation: ${operation}`);
      }

      return {
        ...result,
        requested_operation: operation,
        overwrite_allowed: overwrite,
        force_enabled: force,
      };
    } catch (error) {
      // Convert filesystem errors to structured format
      if (error.code === 'ENOENT') {
        throw new McpError(ErrorCode.InvalidParams, `File not found: ${source}`);
      } else if (error.code === 'EACCES') {
        throw new McpError(ErrorCode.InvalidParams, `Permission denied: ${error.message}`);
      } else if (error.code === 'EISDIR') {
        throw new McpError(ErrorCode.InvalidParams, `Path is a directory: ${error.message}`);
      } else if (error.code === 'EEXIST') {
        throw new McpError(ErrorCode.InvalidParams, `Destination already exists: ${destination}. Use overwrite: true to replace it.`);
      } else if (error.code === 'EXDEV') {
        // Cross-device move attempt
        throw new McpError(ErrorCode.InvalidParams, `Cannot move across different filesystems. Source: ${source}, Destination: ${destination}`);
      } else if (error.code === 'ENOSPC') {
        throw new McpError(ErrorCode.InvalidParams, `No space left on device`);
      } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
        throw new McpError(ErrorCode.InvalidParams, `Too many open files`);
      } else {
        throw error;
      }
    }
  }
}