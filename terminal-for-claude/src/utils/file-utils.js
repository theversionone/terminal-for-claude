import { 
  readFileSync, 
  writeFileSync, 
  existsSync, 
  statSync, 
  readdirSync,
  mkdirSync,
  copyFileSync,
  renameSync,
  unlinkSync,
  rmSync,
  accessSync,
  constants as fsConstants
} from "fs";
import { join, dirname, resolve, normalize, isAbsolute, sep } from "path";
import { homedir, platform } from "os";
import { FILE_LIMITS, FILE_ENCODINGS } from "../config/constants.js";

// Path validation and normalization
export function validateAndNormalizePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error("Path must be a non-empty string");
  }

  // Normalize path separators and resolve relative paths
  const normalizedPath = normalize(resolve(filePath));
  
  // Basic security check - prevent path traversal attacks
  const homePath = homedir();
  if (normalizedPath.includes('..') && !normalizedPath.startsWith(homePath)) {
    throw new Error("Path traversal detected - access denied");
  }

  return normalizedPath;
}

export function validateEncoding(encoding) {
  if (encoding && !FILE_ENCODINGS.includes(encoding)) {
    throw new Error(`Unsupported encoding: ${encoding}. Supported: ${FILE_ENCODINGS.join(', ')}`);
  }
  return encoding || 'utf8';
}

// File metadata utilities
export function getFileStats(filePath) {
  try {
    const stats = statSync(filePath);
    return {
      size: stats.size,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      accessed: stats.atime.toISOString(),
      is_file: stats.isFile(),
      is_directory: stats.isDirectory(),
      is_symbolic_link: stats.isSymbolicLink(),
      permissions: {
        readable: true, // Will be checked by access functions
        writable: true,
        executable: stats.mode & parseInt('111', 8) ? true : false
      }
    };
  } catch (error) {
    throw new Error(`Failed to get file stats: ${error.message}`);
  }
}

export function checkFileAccess(filePath, mode = fsConstants.F_OK) {
  try {
    accessSync(filePath, mode);
    return true;
  } catch {
    return false;
  }
}

export function getFilePermissions(filePath) {
  return {
    exists: checkFileAccess(filePath, fsConstants.F_OK),
    readable: checkFileAccess(filePath, fsConstants.R_OK),
    writable: checkFileAccess(filePath, fsConstants.W_OK),
    executable: checkFileAccess(filePath, fsConstants.X_OK)
  };
}

// File content operations
export function readFileWithMetadata(filePath, encoding = 'utf8') {
  const normalizedPath = validateAndNormalizePath(filePath);
  
  if (!existsSync(normalizedPath)) {
    throw new Error(`File not found: ${normalizedPath}`);
  }

  const stats = statSync(normalizedPath);
  
  if (!stats.isFile()) {
    throw new Error(`Path is not a file: ${normalizedPath}`);
  }

  if (stats.size > FILE_LIMITS.MAX_READ_SIZE) {
    throw new Error(`File too large: ${Math.round(stats.size / 1024 / 1024)}MB exceeds limit of ${Math.round(FILE_LIMITS.MAX_READ_SIZE / 1024 / 1024)}MB`);
  }

  const validEncoding = validateEncoding(encoding);
  const content = readFileSync(normalizedPath, validEncoding);
  const fileStats = getFileStats(normalizedPath);
  const permissions = getFilePermissions(normalizedPath);

  return {
    file_path: normalizedPath,
    content,
    encoding: validEncoding,
    stats: fileStats,
    permissions
  };
}

export function writeFileWithMetadata(filePath, content, options = {}) {
  const { encoding = 'utf8', create_directories = false } = options;
  const normalizedPath = validateAndNormalizePath(filePath);
  const validEncoding = validateEncoding(encoding);

  // Check content size
  const contentSize = Buffer.byteLength(content, validEncoding);
  if (contentSize > FILE_LIMITS.MAX_WRITE_SIZE) {
    throw new Error(`Content too large: ${Math.round(contentSize / 1024 / 1024)}MB exceeds limit of ${Math.round(FILE_LIMITS.MAX_WRITE_SIZE / 1024 / 1024)}MB`);
  }

  // Create parent directories if requested
  if (create_directories) {
    const parentDir = dirname(normalizedPath);
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }
  }

  // Check if we can write to the location
  const parentDir = dirname(normalizedPath);
  if (!existsSync(parentDir)) {
    throw new Error(`Parent directory does not exist: ${parentDir}`);
  }

  if (!checkFileAccess(parentDir, fsConstants.W_OK)) {
    throw new Error(`No write permission to directory: ${parentDir}`);
  }

  // If file exists, check write permissions
  if (existsSync(normalizedPath) && !checkFileAccess(normalizedPath, fsConstants.W_OK)) {
    throw new Error(`No write permission to file: ${normalizedPath}`);
  }

  const beforeStats = existsSync(normalizedPath) ? getFileStats(normalizedPath) : null;
  
  writeFileSync(normalizedPath, content, validEncoding);
  
  const afterStats = getFileStats(normalizedPath);
  const permissions = getFilePermissions(normalizedPath);

  return {
    file_path: normalizedPath,
    content_size: contentSize,
    encoding: validEncoding,
    created: !beforeStats,
    previous_size: beforeStats?.size || 0,
    stats: afterStats,
    permissions
  };
}

// File operations
export function copyFile(sourcePath, destinationPath, options = {}) {
  const { overwrite = false } = options;
  const normalizedSource = validateAndNormalizePath(sourcePath);
  const normalizedDest = validateAndNormalizePath(destinationPath);

  if (!existsSync(normalizedSource)) {
    throw new Error(`Source file not found: ${normalizedSource}`);
  }

  if (!statSync(normalizedSource).isFile()) {
    throw new Error(`Source is not a file: ${normalizedSource}`);
  }

  if (existsSync(normalizedDest) && !overwrite) {
    throw new Error(`Destination already exists: ${normalizedDest}`);
  }

  // Create parent directory if it doesn't exist
  const parentDir = dirname(normalizedDest);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  const sourceStats = getFileStats(normalizedSource);
  copyFileSync(normalizedSource, normalizedDest);
  const destStats = getFileStats(normalizedDest);

  return {
    operation: 'copy',
    source: normalizedSource,
    destination: normalizedDest,
    source_stats: sourceStats,
    destination_stats: destStats
  };
}

export function moveFile(sourcePath, destinationPath, options = {}) {
  const { overwrite = false } = options;
  const normalizedSource = validateAndNormalizePath(sourcePath);
  const normalizedDest = validateAndNormalizePath(destinationPath);

  if (!existsSync(normalizedSource)) {
    throw new Error(`Source file not found: ${normalizedSource}`);
  }

  if (existsSync(normalizedDest) && !overwrite) {
    throw new Error(`Destination already exists: ${normalizedDest}`);
  }

  // Create parent directory if it doesn't exist
  const parentDir = dirname(normalizedDest);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  const sourceStats = getFileStats(normalizedSource);
  renameSync(normalizedSource, normalizedDest);
  const destStats = getFileStats(normalizedDest);

  return {
    operation: 'move',
    source: normalizedSource,
    destination: normalizedDest,
    source_stats: sourceStats,
    destination_stats: destStats
  };
}

export function deleteFile(filePath, options = {}) {
  const { force = false } = options;
  const normalizedPath = validateAndNormalizePath(filePath);

  if (!existsSync(normalizedPath)) {
    if (!force) {
      throw new Error(`File not found: ${normalizedPath}`);
    }
    return {
      operation: 'delete',
      file_path: normalizedPath,
      existed: false
    };
  }

  const stats = getFileStats(normalizedPath);
  
  if (stats.is_directory) {
    throw new Error(`Path is a directory, not a file: ${normalizedPath}`);
  }

  unlinkSync(normalizedPath);

  return {
    operation: 'delete',
    file_path: normalizedPath,
    existed: true,
    deleted_stats: stats
  };
}

// Directory operations
export function createDirectory(dirPath, options = {}) {
  const { recursive = true } = options;
  const normalizedPath = validateAndNormalizePath(dirPath);

  if (existsSync(normalizedPath)) {
    const stats = statSync(normalizedPath);
    if (stats.isDirectory()) {
      return {
        operation: 'create',
        directory_path: normalizedPath,
        created: false,
        existed: true
      };
    } else {
      throw new Error(`Path exists but is not a directory: ${normalizedPath}`);
    }
  }

  mkdirSync(normalizedPath, { recursive });
  const stats = getFileStats(normalizedPath);

  return {
    operation: 'create',
    directory_path: normalizedPath,
    created: true,
    existed: false,
    stats
  };
}

export function listDirectory(dirPath, options = {}) {
  const { include_hidden = false, detailed = true } = options;
  const normalizedPath = validateAndNormalizePath(dirPath);

  if (!existsSync(normalizedPath)) {
    throw new Error(`Directory not found: ${normalizedPath}`);
  }

  if (!statSync(normalizedPath).isDirectory()) {
    throw new Error(`Path is not a directory: ${normalizedPath}`);
  }

  const entries = readdirSync(normalizedPath);
  const items = [];

  for (const entry of entries) {
    // Skip hidden files if not requested
    if (!include_hidden && entry.startsWith('.')) {
      continue;
    }

    const fullPath = join(normalizedPath, entry);
    
    if (detailed) {
      try {
        const stats = getFileStats(fullPath);
        const permissions = getFilePermissions(fullPath);
        items.push({
          name: entry,
          path: fullPath,
          stats,
          permissions
        });
      } catch (error) {
        // If we can't get stats, include basic info
        items.push({
          name: entry,
          path: fullPath,
          error: error.message
        });
      }
    } else {
      items.push({
        name: entry,
        path: fullPath
      });
    }
  }

  return {
    operation: 'list',
    directory_path: normalizedPath,
    item_count: items.length,
    items
  };
}

export function deleteDirectory(dirPath, options = {}) {
  const { recursive = false, force = false } = options;
  const normalizedPath = validateAndNormalizePath(dirPath);

  if (!existsSync(normalizedPath)) {
    if (!force) {
      throw new Error(`Directory not found: ${normalizedPath}`);
    }
    return {
      operation: 'delete',
      directory_path: normalizedPath,
      existed: false
    };
  }

  const stats = getFileStats(normalizedPath);
  
  if (!stats.is_directory) {
    throw new Error(`Path is not a directory: ${normalizedPath}`);
  }

  rmSync(normalizedPath, { recursive, force });

  return {
    operation: 'delete',
    directory_path: normalizedPath,
    existed: true,
    recursive,
    deleted_stats: stats
  };
}

export function checkDirectoryExists(dirPath) {
  const normalizedPath = validateAndNormalizePath(dirPath);
  
  if (!existsSync(normalizedPath)) {
    return {
      operation: 'exists',
      directory_path: normalizedPath,
      exists: false
    };
  }

  const stats = statSync(normalizedPath);
  const isDirectory = stats.isDirectory();
  
  return {
    operation: 'exists',
    directory_path: normalizedPath,
    exists: isDirectory,
    is_directory: isDirectory,
    stats: isDirectory ? getFileStats(normalizedPath) : null
  };
}