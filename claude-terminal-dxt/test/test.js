#!/usr/bin/env node

import { spawn } from "child_process";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🧪 Testing Claude Terminal DXT Server...\n");

const serverPath = join(__dirname, '..', 'src', 'server.js');

function testMCPProtocol() {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Test initialize request
    const initializeRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "test-client",
          version: "1.0.0"
        }
      }
    };

    // Test list tools request
    const listToolsRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    };

    server.stdin.write(JSON.stringify(initializeRequest) + '\\n');
    server.stdin.write(JSON.stringify(listToolsRequest) + '\\n');

    setTimeout(() => {
      server.kill();
      
      console.log("📤 Server Output:");
      console.log(output);
      
      if (errorOutput) {
        console.log("📥 Server Errors:");
        console.log(errorOutput);
      }

      // Basic validation
      if (errorOutput.includes("Claude Terminal MCP Server running")) {
        console.log("✅ Server started successfully");
      } else {
        console.log("❌ Server startup may have issues");
      }

      if (output.includes("tools") || output.includes("execute_command")) {
        console.log("✅ Tools endpoint responding");
      } else {
        console.log("❌ Tools endpoint may have issues");
      }

      resolve();
    }, 2000);

    server.on('error', (error) => {
      console.error("❌ Server spawn error:", error);
      reject(error);
    });
  });
}

async function validateManifest() {
  console.log("📋 Validating manifest.json...");
  
  try {
    const manifestPath = join(__dirname, '..', 'manifest.json');
    const manifest = await import(manifestPath, { assert: { type: 'json' } });
    
    const required = ['dxt_version', 'name', 'version', 'description', 'author', 'server'];
    const missing = required.filter(field => !manifest.default[field]);
    
    if (missing.length === 0) {
      console.log("✅ Manifest has all required fields");
    } else {
      console.log(`❌ Manifest missing fields: ${missing.join(', ')}`);
    }

    if (manifest.default.server?.type === 'node') {
      console.log("✅ Server type is correctly set to 'node'");
    } else {
      console.log("❌ Server type should be 'node'");
    }

    if (manifest.default.tools?.length > 0) {
      console.log(`✅ Manifest declares ${manifest.default.tools.length} tools`);
    } else {
      console.log("❌ No tools declared in manifest");
    }

  } catch (error) {
    console.error("❌ Error reading manifest:", error.message);
  }
}

async function validatePackageJson() {
  console.log("📦 Validating package.json...");
  
  try {
    const packagePath = join(__dirname, '..', 'package.json');
    const pkg = await import(packagePath, { assert: { type: 'json' } });
    
    if (pkg.default.type === 'module') {
      console.log("✅ Package type set to 'module'");
    } else {
      console.log("❌ Package should have type: 'module'");
    }

    if (pkg.default.dependencies?.['@modelcontextprotocol/sdk']) {
      console.log("✅ MCP SDK dependency found");
    } else {
      console.log("❌ MCP SDK dependency missing");
    }

    if (pkg.default.engines?.node) {
      console.log(`✅ Node.js engine requirement: ${pkg.default.engines.node}`);
    } else {
      console.log("❌ Node.js engine requirement not specified");
    }

  } catch (error) {
    console.error("❌ Error reading package.json:", error.message);
  }
}

async function runTests() {
  try {
    await validateManifest();
    console.log();
    
    await validatePackageJson();
    console.log();
    
    await testMCPProtocol();
    console.log();
    
    console.log("🎉 Testing complete! Review the output above for any issues.");
    console.log();
    console.log("📋 Next steps:");
    console.log("1. Run 'npm install' to install dependencies");
    console.log("2. Run 'dxt pack .' to create the .dxt file");
    console.log("3. Install the .dxt file in Claude Desktop");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

runTests();