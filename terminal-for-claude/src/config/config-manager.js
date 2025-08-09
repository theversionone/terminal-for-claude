import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export class ConfigManager {
  constructor() {
    this.configPath = join(homedir(), '.claude-terminal', 'config.json');
    this.defaults = {
      maxBufferSize: 10 * 1024 * 1024, // 10MB
      defaultTimeout: 30000,
      maxTimeout: 300000,
      scriptTimeout: 60000,
      processListLimit: 50,
      maxProcessLimit: 500,
      allowedInterpreters: ["bash", "sh", "powershell", "cmd", "python", "python3", "node", "perl", "ruby"],
      enableLogging: true,
      logLevel: "info",
      securityMode: "standard", // "strict" or "standard"
      commandWhitelist: [],
      commandBlacklist: [],
    };
    
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, 'utf8');
        const userConfig = JSON.parse(content);
        return { ...this.defaults, ...userConfig };
      }
    } catch (error) {
      console.error(`Failed to load config: ${error.message}`);
    }
    
    return this.defaults;
  }

  saveConfig() {
    try {
      const dir = join(homedir(), '.claude-terminal');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.error(`Config saved to ${this.configPath}`);
    } catch (error) {
      console.error(`Failed to save config: ${error.message}`);
    }
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this.saveConfig();
  }

  update(updates) {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  reset() {
    this.config = this.defaults;
    this.saveConfig();
  }

  getAll() {
    return { ...this.config };
  }

  isCommandAllowed(command) {
    const { securityMode, commandWhitelist, commandBlacklist } = this.config;
    
    if (securityMode === 'strict') {
      // In strict mode, only whitelist commands are allowed
      if (commandWhitelist.length === 0) {
        return false; // No commands allowed if whitelist is empty
      }
      
      return commandWhitelist.some(pattern => 
        command.toLowerCase().includes(pattern.toLowerCase())
      );
    }
    
    // In standard mode, check blacklist
    if (commandBlacklist.length > 0) {
      return !commandBlacklist.some(pattern => 
        command.toLowerCase().includes(pattern.toLowerCase())
      );
    }
    
    return true;
  }

  isInterpreterAllowed(interpreter) {
    return this.config.allowedInterpreters.includes(interpreter);
  }
}

// Singleton instance
let configInstance = null;

export function getConfig() {
  if (!configInstance) {
    configInstance = new ConfigManager();
  }
  return configInstance;
}