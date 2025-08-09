import { BaseTool } from "./base-tool.js";
import { 
  createDirectory, 
  listDirectory, 
  deleteDirectory, 
  checkDirectoryExists 
} from "../utils/file-utils.js";
import { DIRECTORY_OPERATIONS } from "../config/constants.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export class DirectoryOperationsTool extends BaseTool {
  constructor() {
    super(
      "directory_operations",
      "Perform directory operations (create, list, delete, exists) - better than shell commands",
      {
        type: "object",
        properties: {
          operation: {
            type: "string",
            description: "Operation to perform",
            enum: [
              DIRECTORY_OPERATIONS.CREATE,
              DIRECTORY_OPERATIONS.LIST,
              DIRECTORY_OPERATIONS.DELETE,
              DIRECTORY_OPERATIONS.EXISTS
            ],
          },
          path: {
            type: "string",
            description: "Directory path for the operation",
          },
          recursive: {
            type: "boolean",
            description: "Create parent directories (create) or delete recursively (delete). Default: true for create, false for delete",
          },
          include_hidden: {
            type: "boolean",
            description: "Include hidden files and directories in listing (default: false)",
          },
          detailed: {
            type: "boolean",
            description: "Include detailed file information in listing (default: true)",
          },
          force: {
            type: "boolean",
            description: "Force delete even if directory doesn't exist (default: false)",
          },
        },
        required: ["operation", "path"],
      }
    );
  }

  async run(args) {
    const { 
      operation, 
      path, 
      recursive, 
      include_hidden = false, 
      detailed = true,
      force = false 
    } = args;
    
    if (!operation || !Object.values(DIRECTORY_OPERATIONS).includes(operation)) {
      throw new McpError(
        ErrorCode.InvalidParams, 
        `Invalid operation. Must be one of: ${Object.values(DIRECTORY_OPERATIONS).join(', ')}`
      );
    }

    if (!path || typeof path !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, "path must be a non-empty string");
    }

    try {
      let result;
      
      switch (operation) {
        case DIRECTORY_OPERATIONS.CREATE:
          result = createDirectory(path, { 
            recursive: recursive !== undefined ? recursive : true 
          });
          break;
          
        case DIRECTORY_OPERATIONS.LIST:
          result = listDirectory(path, { 
            include_hidden, 
            detailed 
          });
          // Add summary information for Claude
          result.summary = this.createListingSummary(result.items);
          break;
          
        case DIRECTORY_OPERATIONS.DELETE:
          result = deleteDirectory(path, { 
            recursive: recursive !== undefined ? recursive : false,
            force 
          });
          break;
          
        case DIRECTORY_OPERATIONS.EXISTS:
          result = checkDirectoryExists(path);
          break;
          
        default:
          throw new McpError(ErrorCode.InvalidParams, `Unsupported operation: ${operation}`);
      }

      return {
        ...result,
        requested_operation: operation,
        options: {
          recursive: recursive,
          include_hidden: include_hidden,
          detailed: detailed,
          force: force
        }
      };
    } catch (error) {
      // Convert filesystem errors to structured format
      if (error.code === 'ENOENT') {
        throw new McpError(ErrorCode.InvalidParams, `Directory not found: ${path}`);
      } else if (error.code === 'EACCES') {
        throw new McpError(ErrorCode.InvalidParams, `Permission denied: ${path}`);
      } else if (error.code === 'ENOTDIR') {
        throw new McpError(ErrorCode.InvalidParams, `Path is not a directory: ${path}`);
      } else if (error.code === 'EEXIST') {
        throw new McpError(ErrorCode.InvalidParams, `Directory already exists: ${path}`);
      } else if (error.code === 'ENOTEMPTY') {
        throw new McpError(ErrorCode.InvalidParams, `Directory not empty: ${path}. Use recursive: true to delete non-empty directories.`);
      } else if (error.code === 'ENOSPC') {
        throw new McpError(ErrorCode.InvalidParams, `No space left on device`);
      } else {
        throw error;
      }
    }
  }

  createListingSummary(items) {
    const summary = {
      total_items: items.length,
      files: 0,
      directories: 0,
      symbolic_links: 0,
      other: 0,
      total_size: 0,
      largest_file: null,
      most_recent: null
    };

    let largestSize = 0;
    let mostRecentTime = null;

    for (const item of items) {
      if (item.error) {
        summary.other++;
        continue;
      }

      const stats = item.stats;
      if (!stats) {
        summary.other++;
        continue;
      }

      // Count by type
      if (stats.is_file) {
        summary.files++;
        summary.total_size += stats.size;
        
        // Track largest file
        if (stats.size > largestSize) {
          largestSize = stats.size;
          summary.largest_file = {
            name: item.name,
            size: stats.size,
            size_mb: Math.round(stats.size / 1024 / 1024 * 100) / 100
          };
        }
      } else if (stats.is_directory) {
        summary.directories++;
      } else if (stats.is_symbolic_link) {
        summary.symbolic_links++;
      } else {
        summary.other++;
      }

      // Track most recent modification
      const modTime = new Date(stats.modified);
      if (!mostRecentTime || modTime > mostRecentTime) {
        mostRecentTime = modTime;
        summary.most_recent = {
          name: item.name,
          modified: stats.modified,
          is_file: stats.is_file,
          is_directory: stats.is_directory
        };
      }
    }

    // Convert total size to human readable
    summary.total_size_mb = Math.round(summary.total_size / 1024 / 1024 * 100) / 100;
    summary.total_size_gb = Math.round(summary.total_size / 1024 / 1024 / 1024 * 100) / 100;

    return summary;
  }
}