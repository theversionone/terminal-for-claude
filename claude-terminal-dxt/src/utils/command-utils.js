import { exec } from "child_process";
import { promisify } from "util";
import { platform } from "os";

export const execAsync = promisify(exec);

export const MAX_BUFFER_SIZE = 1024 * 1024 * 10; // 10MB
export const DEFAULT_TIMEOUT = 30000;
export const MAX_TIMEOUT = 300000;

export function getExecOptions(options = {}) {
  return {
    timeout: Math.min(options.timeout || DEFAULT_TIMEOUT, MAX_TIMEOUT),
    maxBuffer: MAX_BUFFER_SIZE,
    env: options.environment ? { ...process.env, ...options.environment } : process.env,
    ...(options.working_directory && { cwd: options.working_directory }),
  };
}

export function isWindows() {
  return platform() === 'win32';
}

export function getShell() {
  return isWindows() ? 'cmd.exe' : '/bin/sh';
}

export function escapeShellArg(arg) {
  if (isWindows()) {
    return `"${arg.replace(/"/g, '""')}"`;
  }
  return `'${arg.replace(/'/g, "'\\''")}'`;
}