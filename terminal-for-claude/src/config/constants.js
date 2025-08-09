export const EXTENSION_NAME = "claude-terminal";
export const EXTENSION_VERSION = "1.0.0";

export const SCRIPT_EXTENSIONS = {
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

export const SCRIPT_COMMANDS = {
  bash: (path) => `bash "${path}"`,
  sh: (path) => `sh "${path}"`,
  powershell: (path) => `powershell -ExecutionPolicy Bypass -File "${path}"`,
  cmd: (path) => `cmd /c "${path}"`,
  python: (path) => `python "${path}"`,
  python3: (path) => `python3 "${path}"`,
  node: (path) => `node "${path}"`,
  perl: (path) => `perl "${path}"`,
  ruby: (path) => `ruby "${path}"`,
};

export const PROCESS_LIMITS = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 500,
};

export const TIMEOUTS = {
  COMMAND: 30000,
  SCRIPT: 60000,
  PROCESS: 10000,
  KILL: 5000,
};