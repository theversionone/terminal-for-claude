# Claude Terminal Desktop Extension (DXT)

A comprehensive Desktop Extension for Claude that provides full terminal access and command execution capabilities. This extension allows Claude to execute shell commands, run scripts, manage processes, and access system information directly from the Claude Desktop application.

## 🚨 Security Warning

**This extension provides Claude with full terminal access to your system.** It can execute any command, read/write files, and perform system administration tasks. Only use this extension with trusted Claude instances and be aware of the commands being executed.

## Features

- **Command Execution**: Execute shell commands with timeout and error handling
- **Script Execution**: Run scripts in various interpreters (bash, PowerShell, Python, Node.js, etc.)
- **Process Management**: List and terminate processes
- **System Information**: Get comprehensive system details
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Security Features**: Configurable timeouts, buffer limits, and error handling
- **Detailed Logging**: Comprehensive execution logs with timing information

## Prerequisites

- Node.js 18.0.0 or higher
- Claude Desktop application
- DXT CLI tool for packaging

## Installation

### Step 1: Install Dependencies

```bash
cd claude-terminal-dxt
npm install
```

### Step 2: Install DXT CLI (if not already installed)

```bash
npm install -g @anthropic/dxt
```

### Step 3: Package the Extension

```bash
dxt pack .
```

This will create a `claude-terminal.dxt` file in your current directory.

### Step 4: Install in Claude Desktop

1. Open Claude Desktop
2. Go to Settings → Extensions
3. Click "Install Extension"
4. Select the `claude-terminal.dxt` file
5. Confirm the installation

## Usage

Once installed, Claude will have access to the following tools:

### 1. Execute Command

Execute shell commands directly:

```
Claude, run "ls -la" to list all files in the current directory
```

```
Claude, execute "git status" to check the repository status
```

### 2. Execute Script

Run scripts with specific interpreters:

```
Claude, run this Python script:
print("Hello from Python!")
import sys
print(f"Python version: {sys.version}")
```

```
Claude, execute this bash script:
#!/bin/bash
echo "Current user: $(whoami)"
echo "Current directory: $(pwd)"
```

### 3. System Information

Get comprehensive system details:

```
Claude, show me the system information
```

### 4. Process Management

List and manage processes:

```
Claude, list all running processes containing "node"
```

```
Claude, kill process with PID 1234
```

## Available Tools

### `execute_command`
- **Purpose**: Execute shell commands
- **Parameters**:
  - `command` (required): The command to execute
  - `working_directory` (optional): Working directory for execution
  - `timeout` (optional): Timeout in milliseconds (default: 30000, max: 300000)
  - `environment` (optional): Environment variables

### `execute_script`
- **Purpose**: Execute scripts with specific interpreters
- **Parameters**:
  - `script_content` (required): The script content
  - `interpreter` (required): bash, sh, powershell, cmd, python, python3, node, perl, ruby
  - `working_directory` (optional): Working directory for execution
  - `timeout` (optional): Timeout in milliseconds (default: 60000)

### `get_system_info`
- **Purpose**: Get system information
- **Parameters**: None

### `list_processes`
- **Purpose**: List running processes
- **Parameters**:
  - `filter` (optional): Filter for process names (regex supported)
  - `limit` (optional): Limit number of processes (default: 50, max: 500)

### `kill_process`
- **Purpose**: Terminate processes
- **Parameters**:
  - `pid` (required): Process ID to terminate
  - `force` (optional): Force kill the process
  - `signal` (optional): Signal to send (SIGTERM, SIGKILL, etc.)

## Configuration

The extension includes several built-in security measures:

- **Timeouts**: Commands have configurable timeouts to prevent hanging
- **Buffer Limits**: Output is limited to 10MB to prevent memory issues
- **Error Handling**: Comprehensive error reporting and graceful failures
- **Process Safety**: Process termination includes safety checks
- **Temporary Files**: Script execution uses secure temporary files that are automatically cleaned up

## Development

### Project Structure

```
claude-terminal-dxt/
├── manifest.json          # DXT extension manifest
├── package.json          # Node.js dependencies
├── README.md            # This file
├── src/
│   └── server.js        # MCP server implementation
└── test/
    └── test.js          # Basic test suite
```

### Testing

Run basic tests:

```bash
npm test
```

Test the server directly:

```bash
npm run dev
```

### Building for Distribution

1. Ensure all dependencies are installed:
   ```bash
   npm install --production
   ```

2. Package the extension:
   ```bash
   dxt pack .
   ```

3. The resulting `.dxt` file can be distributed and installed by users.

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure Claude has necessary permissions to execute commands
2. **Command Not Found**: Verify the command/interpreter is installed and in PATH
3. **Timeout Errors**: Increase timeout values for long-running commands
4. **Buffer Overflow**: Large outputs may be truncated (10MB limit)

### Debug Mode

Run the server in debug mode:

```bash
npm run dev
```

This will start the server with Node.js inspector for debugging.

### Logs

The server logs errors to stderr. Check the Claude Desktop console or terminal for detailed error messages.

## Security Considerations

This extension provides powerful capabilities that come with security implications:

1. **Full System Access**: Can execute any command the user can run
2. **File System Access**: Can read, write, and delete files
3. **Network Access**: Can make network requests and connections
4. **Process Control**: Can start and terminate processes
5. **Environment Access**: Can read environment variables and system information

### Best Practices

1. **Review Commands**: Always review commands before execution
2. **Limit Scope**: Use working directories to limit command scope
3. **Monitor Usage**: Keep track of what commands are being executed
4. **Regular Updates**: Keep the extension updated for security patches
5. **Backup Data**: Ensure important data is backed up before running destructive commands

## License

MIT License - see LICENSE file for details.

## Support

For issues and support:
1. Check the troubleshooting section above
2. Review the DXT documentation at https://github.com/anthropics/dxt
3. File issues at the appropriate repository

## Version History

- **1.0.0**: Initial release with full terminal access capabilities
  - Command execution with timeout and error handling
  - Script execution for multiple interpreters
  - Process management and system information
  - Cross-platform compatibility
  - Security features and comprehensive logging