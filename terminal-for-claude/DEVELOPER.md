# Developer Guide - Claude Terminal Extension

## Architecture Overview

The extension has been refactored into a modular architecture for better maintainability and extensibility.

```
claude-terminal-dxt/
├── src/
│   ├── server.js              # Main server entry point
│   ├── tools/                 # Tool implementations
│   │   ├── index.js          # Tool exports
│   │   ├── base-tool.js      # Base class for all tools
│   │   ├── tool-registry.js  # Tool registration and management
│   │   ├── execute-command.js # Command execution tool
│   │   ├── execute-script.js  # Script execution tool
│   │   ├── system-info.js    # System information tool
│   │   └── process-manager.js # Process management tools
│   ├── utils/                # Utility functions
│   │   └── command-utils.js  # Command execution utilities
│   └── config/              # Configuration management
│       ├── constants.js     # Application constants
│       └── config-manager.js # Runtime configuration
```

## Adding New Tools

### Step 1: Create Your Tool Class

Create a new file in `src/tools/your-tool.js`:

```javascript
import { BaseTool } from "./base-tool.js";

export class YourTool extends BaseTool {
  constructor() {
    super(
      "tool_name",           // Tool identifier
      "Tool description",    // Human-readable description
      {                      // Input schema (JSON Schema)
        type: "object",
        properties: {
          param1: {
            type: "string",
            description: "Parameter description"
          }
        },
        required: ["param1"]
      }
    );
  }

  async run(args) {
    // Your tool implementation
    // Return an object with the results
    return {
      result: "success",
      data: args.param1
    };
  }
}
```

### Step 2: Register Your Tool

Add your tool to the registry in `src/tools/tool-registry.js`:

```javascript
import { YourTool } from "./your-tool.js";

registerDefaultTools() {
  // ... existing tools
  this.register(new YourTool());
}
```

### Step 3: Export Your Tool

Add to `src/tools/index.js`:

```javascript
export { YourTool } from "./your-tool.js";
```

## Tool Development Guidelines

### Base Tool Class

All tools inherit from `BaseTool` which provides:

- **Automatic error handling**: Errors are caught and formatted consistently
- **Execution timing**: All tools report execution time
- **Success/failure formatting**: Consistent JSON output format
- **Parameter validation**: Built-in validation helpers

### Tool Methods

- `run(args)`: Main implementation (required)
- `validateArgs(args, required)`: Helper for parameter validation
- `formatSuccess(result, time)`: Override for custom success formatting
- `formatError(error, time)`: Override for custom error formatting

### Error Handling

```javascript
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

// For parameter validation errors
throw new McpError(ErrorCode.InvalidParams, "Error message");

// For other errors, throw regular Error
throw new Error("Something went wrong");
```

## Configuration System

The configuration manager allows runtime configuration without code changes.

### Default Configuration

See `src/config/config-manager.js` for default values.

### User Configuration

Users can create `~/.claude-terminal/config.json`:

```json
{
  "maxTimeout": 60000,
  "securityMode": "strict",
  "commandWhitelist": ["ls", "git", "npm"],
  "enableLogging": true
}
```

### Using Configuration in Tools

```javascript
import { getConfig } from "../config/config-manager.js";

const config = getConfig();
const timeout = config.get('maxTimeout');
```

## Testing

### Unit Testing a Tool

```javascript
// test/tools/your-tool.test.js
import { YourTool } from "../../src/tools/your-tool.js";

const tool = new YourTool();
const result = await tool.execute({ param1: "test" });
console.assert(result.content[0].text.includes("success"));
```

### Integration Testing

Run the test suite:

```bash
npm test
```

## Security Considerations

1. **Input Validation**: Always validate inputs in your tool's `run()` method
2. **Command Injection**: Use proper escaping when executing commands
3. **Timeouts**: Always enforce timeouts for external operations
4. **Buffer Limits**: Limit output sizes to prevent memory issues
5. **File Operations**: Be careful with file paths and permissions

## Utility Functions

### Command Utilities

```javascript
import { 
  execAsync,           // Promisified exec
  getExecOptions,      // Standard exec options
  isWindows,          // Platform check
  escapeShellArg      // Shell argument escaping
} from "../utils/command-utils.js";
```

## Constants

Access application constants:

```javascript
import { 
  TIMEOUTS,
  SCRIPT_EXTENSIONS,
  PROCESS_LIMITS 
} from "../config/constants.js";
```

## Best Practices

1. **Modularity**: Keep tools focused on a single responsibility
2. **Error Messages**: Provide clear, actionable error messages
3. **Documentation**: Document your tool's parameters and behavior
4. **Cross-platform**: Test on Windows, macOS, and Linux
5. **Performance**: Consider timeout and buffer limits
6. **Logging**: Use console.error for debug logging (goes to stderr)

## Debugging

Enable debug output by setting environment variables:

```bash
DEBUG=* node src/server.js
```

## Contributing

1. Follow the existing code structure
2. Add tests for new functionality
3. Update documentation
4. Test on multiple platforms
5. Follow security best practices

## Future Enhancements

Planned improvements:
- Plugin system for external tools
- Web-based configuration UI
- Tool composition and pipelines
- Async event streaming
- Remote execution support