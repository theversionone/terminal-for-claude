# Installation and Packaging Guide

This guide covers the complete process of setting up, testing, and packaging the Claude Terminal Desktop Extension.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js 18.0.0+**: Download from [nodejs.org](https://nodejs.org/)
2. **npm**: Comes with Node.js
3. **Claude Desktop**: The official Claude Desktop application
4. **DXT CLI**: For packaging extensions

## Step-by-Step Installation

### 1. Install DXT CLI

The DXT CLI is required to package your extension into a `.dxt` file.

```bash
# Install globally using npm
npm install -g @anthropic/dxt

# Verify installation
dxt --version
```

### 2. Install Project Dependencies

Navigate to the project directory and install dependencies:

```bash
cd claude-terminal-dxt
npm install
```

### 3. Run Tests (Optional but Recommended)

Validate the extension before packaging:

```bash
npm test
```

This will:
- Validate the manifest.json structure
- Check package.json configuration
- Test the MCP server startup
- Verify tool endpoints

### 4. Package the Extension

Create the distributable `.dxt` file:

```bash
dxt pack .
```

This command will:
- Validate your manifest.json
- Bundle all necessary files
- Create a `claude-terminal.dxt` file

**Expected output:**
```
✓ Validating manifest...
✓ Bundling files...
✓ Created claude-terminal.dxt (XX KB)
```

### 5. Install in Claude Desktop

1. **Open Claude Desktop**
2. **Navigate to Settings**: Click the settings icon or use Cmd/Ctrl + ,
3. **Go to Extensions**: Find the Extensions section
4. **Install Extension**: Click "Install Extension" or "Add Extension"
5. **Select File**: Choose the `claude-terminal.dxt` file you created
6. **Confirm Installation**: Review permissions and confirm

### 6. Verify Installation

After installation, Claude should have access to new terminal capabilities. Test with:

```
Hello Claude! Can you show me the system information using your new terminal access?
```

## DXT CLI Commands

Here are the essential DXT CLI commands for development:

### Basic Commands

```bash
# Package extension
dxt pack .

# Package with specific output name
dxt pack . --output my-terminal-extension.dxt

# Validate manifest without packaging
dxt validate .

# Show help
dxt --help
```

### Advanced Options

```bash
# Package with verbose output
dxt pack . --verbose

# Package excluding certain files
dxt pack . --exclude "*.log" --exclude "test/"

# Validate specific manifest file
dxt validate ./manifest.json
```

## Project Structure for DXT

Your extension should follow this structure for successful packaging:

```
claude-terminal-dxt/
├── manifest.json          # Required: Extension metadata
├── package.json          # Required for Node.js extensions
├── src/
│   └── server.js         # Main MCP server implementation
├── node_modules/         # Will be included in package
├── README.md            # Recommended: Documentation
├── .gitignore          # Optional: For development
└── test/               # Optional: Test files
    └── test.js
```

## Packaging Best Practices

### 1. Production Dependencies Only

Before packaging, ensure only production dependencies are installed:

```bash
# Clean install production dependencies
rm -rf node_modules
npm ci --production
```

### 2. Optimize Bundle Size

- Remove unnecessary files (tests, docs, etc.)
- Use `.dxtignore` file to exclude files from packaging
- Minimize dependency tree

### 3. Create .dxtignore (Optional)

Create a `.dxtignore` file to exclude files from the package:

```
# .dxtignore
test/
*.test.js
docs/
.git/
*.log
.env
```

### 4. Validate Before Distribution

Always test the packaged extension:

```bash
# Run validation
dxt validate .

# Test the server
npm test

# Package
dxt pack .
```

## Troubleshooting

### Common Packaging Issues

1. **"Manifest validation failed"**
   - Check manifest.json syntax
   - Ensure all required fields are present
   - Validate JSON structure

2. **"Server command not found"**
   - Verify server.command path in manifest.json
   - Ensure server script exists
   - Check file permissions

3. **"Dependencies missing"**
   - Run `npm install`
   - Check package.json dependencies
   - Ensure Node.js version compatibility

4. **"Package size too large"**
   - Remove unnecessary files
   - Use production dependencies only
   - Add files to .dxtignore

### Validation Errors

```bash
# Common validation fixes
dxt validate . --verbose  # Get detailed error info
dxt pack . --dry-run     # Test packaging without creating file
```

### Testing the Packaged Extension

1. **Install in Test Environment**: Use a separate Claude Desktop installation
2. **Test Core Functionality**: Verify all tools work correctly
3. **Check Error Handling**: Test with invalid inputs
4. **Monitor Performance**: Ensure reasonable response times

## Distribution

### For Personal Use

Simply install the `.dxt` file in your Claude Desktop application.

### For Team Distribution

1. **Share the .dxt file** with team members
2. **Provide installation instructions** (steps 5-6 above)
3. **Document usage examples** in your README.md

### For Public Distribution

1. **Host the .dxt file** on a website or repository
2. **Provide comprehensive documentation**
3. **Include security warnings** and usage guidelines
4. **Consider creating a landing page** with installation instructions

## Security Considerations

Before distributing your extension:

1. **Review all code** for security vulnerabilities
2. **Test with limited permissions** when possible
3. **Document security implications** in README.md
4. **Consider code signing** for wider distribution
5. **Provide clear usage guidelines**

## Version Management

When updating your extension:

1. **Update version in manifest.json**
2. **Update version in package.json**
3. **Document changes** in README.md or CHANGELOG.md
4. **Test thoroughly** before redistribution
5. **Repackage with dxt pack**

## Support and Resources

- **DXT Documentation**: https://github.com/anthropics/dxt
- **MCP Protocol**: https://github.com/modelcontextprotocol/specification
- **Claude Desktop**: Official Claude documentation
- **Node.js**: https://nodejs.org/docs/

---

**Next Steps**: After successful packaging, your `claude-terminal.dxt` file is ready for installation and use!