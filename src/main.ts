import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as exec from '@actions/exec';
import * as io from '@actions/io';

/**
 * Install the latest version of FortifyVulnerabilityExporter
 * @returns path to the directory where FortifyVulnerabilityExporter was installed
 */
async function installTool(): Promise<string> {
  let url = 'https://github.com/fortify/FortifyVulnerabilityExporter/releases/latest/download/FortifyVulnerabilityExporter.zip'
  core.debug("Downloading from " + url);
  const toolZip = await tc.downloadTool(url);
  core.debug("Extracting " + toolZip);
  return await tc.extractZip(toolZip);
}

/**
 * Get the configuration file to use, returning:
 * 1. The value of the 'config' input parameter if defined
 * 2. config/SSCTo${to} if both 'ssc_base_url' and 'to' input variables are defined
 * 3. config/FoDTo${to} if both 'fod_base_url' and 'to' input variables are defined
 * @returns the configuration file to use
 */
function getConfigFile(): string {
  let result = core.getInput('export_config');
  if ( !result ) {
    let exportTarget = core.getInput('export_target');
    if ( !exportTarget ) {
      throw "Either 'config' or 'export_target' input parameters must be specified"
    } else {
      if ( core.getInput('ssc_base_url', { required: false }) ) {
        result = `config/SSCTo${exportTarget}.yml`;
      } else if ( core.getInput('fod_base_url', { required: false }) ) {
        result = `config/FoDTo${exportTarget}.yml`;
      } else {
        throw "Either 'ssc_base_url' or 'fod_base_url' input parameters must be specified"
      }
    }
  }
  return result;
}

/**
 * Run FortifyVulnerabilityExporter using the given java executable, tool installation directory, and configuration
 * file. Other tool options are read by FortifyVulnerabilityExporter directly from the INPUT_* environment variables.
 * @param javaPath Path to the java executable
 * @param toolDir Path where FortifyVulnerabilityExporter was installed
 * @param configFile Configuration file to use for FortifyVulnerabilityExporter
 */
async function runTool(javaPath: string, toolDir: string, configFile: string): Promise<void> {
  await exec.exec(`"${javaPath}"`, ['-jar', 'FortifyVulnerabilityExporter.jar', `--export.config=${configFile}`], {
    cwd: toolDir
  });
}

/**
 * This method first checks all prerequisites (Java installed, required inputs defined),
 * then installs FortifyVulnerabilityExporter and runs it.
 */
async function main(): Promise<void> {
  try {
    core.info("Verifying Java is available");
    const javaPath = await io.which('java', true);
    core.info("Determine configuration file to use");
    const configFile = getConfigFile();
    core.info("Install FortifyVulnerabilityExporter");
    const toolDir = await installTool();
    core.info("Run FortifyVulnerabilityExporter");
    await runTool(javaPath, toolDir, configFile);
    core.info("Finished successfully");
  } catch (err) {
    core.setFailed("Action failed with error: "+err);
  }
}

main();
