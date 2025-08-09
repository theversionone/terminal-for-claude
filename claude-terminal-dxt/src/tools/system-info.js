import { BaseTool } from "./base-tool.js";
import { platform, arch, release, type, cpus, homedir, tmpdir } from "os";

export class SystemInfoTool extends BaseTool {
  constructor() {
    super(
      "get_system_info",
      "Get comprehensive system information",
      {
        type: "object",
        properties: {},
      }
    );
  }

  async run() {
    const systemInfo = {
      platform: platform(),
      architecture: arch(),
      release: release(),
      type: type(),
      node_version: process.version,
      uptime: Math.round(process.uptime()),
      memory: process.memoryUsage(),
      cpu_count: cpus().length,
      cpu_info: this.getCpuInfo(),
      home_directory: homedir(),
      temp_directory: tmpdir(),
      current_working_directory: process.cwd(),
      environment_variables: Object.keys(process.env).length,
      timestamp: new Date().toISOString(),
    };

    return {
      system_info: systemInfo,
    };
  }

  getCpuInfo() {
    const cpuList = cpus();
    if (cpuList.length > 0) {
      return {
        model: cpuList[0].model,
        speed: cpuList[0].speed,
        cores: cpuList.length,
      };
    }
    return null;
  }
}