import { BaseTool } from "./base-tool.js";
import { readFileWithMetadata } from "../utils/file-utils.js";
import { FILE_ENCODINGS } from "../config/constants.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export class FileReadTool extends BaseTool {
  constructor() {
    super(
      "file_read",
      "Read file contents with metadata - safer and more informative than shell commands",
      {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "Path to the file to read (absolute or relative)",
          },
          encoding: {
            type: "string",
            description: "File encoding (default: utf8)",
            enum: FILE_ENCODINGS,
          },
        },
        required: ["file_path"],
      }
    );
  }

  async run(args) {
    const { file_path, encoding = 'utf8' } = args;
    
    if (!file_path || typeof file_path !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, "file_path must be a non-empty string");
    }

    try {
      const result = readFileWithMetadata(file_path, encoding);
      
      return {
        operation: 'file_read',
        ...result,
        content_length: result.content.length,
        content_type: this.detectContentType(file_path, result.content),
      };
    } catch (error) {
      // Convert filesystem errors to structured format
      if (error.code === 'ENOENT') {
        throw new McpError(ErrorCode.InvalidParams, `File not found: ${file_path}`);
      } else if (error.code === 'EACCES') {
        throw new McpError(ErrorCode.InvalidParams, `Permission denied: ${file_path}`);
      } else if (error.code === 'EISDIR') {
        throw new McpError(ErrorCode.InvalidParams, `Path is a directory: ${file_path}`);
      } else {
        throw error;
      }
    }
  }

  detectContentType(filePath, content) {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    // Try to detect based on file extension
    const contentTypes = {
      'js': 'javascript',
      'mjs': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'h': 'c-header',
      'hpp': 'cpp-header',
      'css': 'css',
      'html': 'html',
      'htm': 'html',
      'xml': 'xml',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'ini': 'ini',
      'cfg': 'config',
      'conf': 'config',
      'md': 'markdown',
      'txt': 'text',
      'log': 'log',
      'sh': 'shell',
      'bash': 'bash',
      'zsh': 'zsh',
      'fish': 'fish',
      'ps1': 'powershell',
      'bat': 'batch',
      'cmd': 'batch',
    };

    if (extension && contentTypes[extension]) {
      return contentTypes[extension];
    }

    // Try to detect based on content (simple heuristics)
    const firstLine = content.split('\n')[0];
    
    if (firstLine.startsWith('#!')) {
      if (firstLine.includes('python')) return 'python';
      if (firstLine.includes('node')) return 'javascript';
      if (firstLine.includes('bash')) return 'bash';
      if (firstLine.includes('sh')) return 'shell';
      return 'script';
    }

    if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
      try {
        JSON.parse(content);
        return 'json';
      } catch {
        // Not valid JSON
      }
    }

    if (content.includes('<?xml')) {
      return 'xml';
    }

    if (content.includes('<!DOCTYPE html') || content.includes('<html')) {
      return 'html';
    }

    return 'text';
  }
}