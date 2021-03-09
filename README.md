# Export Fortify vulnerability data

Build secure software fast with [Fortify](https://www.microfocus.com/en-us/solutions/application-security). Fortify offers end-to-end application security solutions with the flexibility of testing on-premises and on-demand to scale and cover the entire software development lifecycle.  With Fortify, find security issues early and fix at the speed of DevOps. 

This GitHub Action utilizes [FortifyVulnerabilityExporter](https://github.com/fortify/FortifyVulnerabilityExporter) to export Fortify vulnerability data from either Fortify on Demand (FoD) or Fortify Software Security Center (SSC) to various output formats or other systems. In the GitHub ecosystem, the default use case for this action is to export Fortify SAST results to GitHub's Security Code Scanning Alerts. Apart from this default use case, this GitHub Action also supports any of the other export targets provided by FortifyVulnerabilityExporter.

## Requirements

### FoD or SSC instance
Obviously you will need to have an FoD tenant or SSC instance from which you can retrieve Fortify scan results. If you are not already a Fortify customer, check out our [Free Trial](https://www.microfocus.com/en-us/products/application-security-testing/free-trial).

### Network connectivity
The FoD or SSC instance from which to retrieve vulnerability data needs to be accessible from the GitHub Runner where this action is being executed. Following table lists some considerations:

| Source | Runner        | Considerations |
| ------ | ------------- | -------------- |
| FoD    | GitHub-hosted | Usually works without any issues |
| FoD    | Self-hosted   | May need to allow network/proxy access from the self-hosted runner to FoD |
| SSC    | GitHub-hosted | GitHub lists [IP addresses for GitHub-hosted runners](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#ip-addresses) that need to be allowed network access to SSC. Exposing an SSC instance to the internet, even if limited to only GitHub IP addresses, could pose a security risk. |
| SSC    | Self-hosted   | May need to allow network access from the self-hosted runner to SSC if in different network segments |

### Java
This GitHub Action requires Java to be installed on the GitHub Runner. At the time of writing, all GitHub-hosted runners provide one or more Java installations, but FortifyVulnerabilityExporter may not have been tested with the Java versions provided by a specific runner. If you want to run this action on a GitHub Runner that does not have Java installed, or if you want to use a specific Java version for running FortifyVulnerabilityExporter, you can use the [setup-java](https://github.com/actions/setup-java) action before using the `gha-export-vulnerabilities` action.

## Usage

The primary use case for this action is after completion of a Fortify SAST scan. See the [Fortify ScanCentral Scan](https://github.com/marketplace/actions/fortify-scancentral-scan) and [Fortify on Demand Scan](https://github.com/marketplace/actions/fortify-on-demand-scan) actions for more details on how to initiate SAST scans on Fortify ScanCentral SAST or Fortify on Demand in your GitHub Actions workflow. Note that some export targets may also support other scan types like Dynamic (DAST), Mobile (MAST) and Open Source/Software Composition (OSS/SCA) issues; please see the relevant documentation for running such scans before invoking this action.

The sections below list sample workflows and related information for exporting vulnerability data from respectively FoD or SSC into GitHub Security Code Scanning Alerts or to other export targets. Additional sample workflows implementing this and other Fortify actions can be found in the following repositories:
  * [EightBall sample workflows](https://github.com/fortify/gha-sample-workflows-eightball/tree/master/.github/workflows)

### Export FoD vulnerability data

#### FoD to GitHub Code Scanning Alerts

This example workflow demonstrates how to export vulnerability data from FoD into GitHub Code Scanning Alerts.

```yaml
name: Import FoD SAST Results into GitHub Code Scanning Alerts
on: [workflow dispatch]
      
jobs:                                                  
  Export-FoD-To-GitHub:
    runs-on: ubuntu-latest

    steps:
      # Pull SAST issues from Fortify on Demand and generate GitHub-optimized SARIF output
      - name: Export Results
        uses: fortify/gha-export-vulnerabilities@v1
        with:
          fod_base_url: ${{ secrets.FOD_BASE_URL }}
          fod_tenant: ${{ secrets.FOD_TENANT }}
          fod_user: ${{ secrets.FOD_USER }}
          fod_password: ${{ secrets.FOD_PAT }}
          fod_release_id: ${{ secrets.FOD_RELEASE_ID }}
      
      # Import Fortify SAST results to GitHub Security Code Scanning
      - name: Import Results
        uses: github/codeql-action/upload-sarif@v1
        with:
          sarif_file: ./gh-fortify-sast.sarif

```

##### Considerations

* Issues that are marked as Fix Validated or are suppressed in FoD are ignored.
* SARIF is designed specifically for SAST findings, so the GitHub/SARIF output does not include Dynamic (DAST), Mobile (MAST) and Open Source/Software Composition (OSS/SCA) issues.
* GitHub Code Scanning currently supports SARIF files with up to 1,000 issues. If the FoD release contains more than 1,000 issues, the action will abort.
* SARIF level `warning` is used for Critical or High vulnerabilities, `note` is used Medium and Low vulnerabilities. Fortify Priority Order (severity) is assigned via tags for filtering.

#### FoD to other output formats

This example workflow demonstrates how to export vulnerability data from FoD to a CSV file and then archive the generated CSV file as an artifact. The description for the `export_target` input parameter in the [FoD Inputs](#fod-inputs) section lists the supported export targets.

```yaml
name: Export FoD Results to CSV
on: [workflow dispatch]
      
jobs:                                                  
  Export-FoD-To-CSV:
    runs-on: ubuntu-latest

    steps:
      # Pull SAST issues from Fortify on Demand and generate CSV output
      - name: Export Results
        uses: fortify/gha-export-vulnerabilities@v1
        with:
          export_target: CSV
          fod_base_url: ${{ secrets.FOD_BASE_URL }}
          fod_tenant: ${{ secrets.FOD_TENANT }}
          fod_user: ${{ secrets.FOD_USER }}
          fod_password: ${{ secrets.FOD_PAT }}
          fod_release_id: ${{ secrets.FOD_RELEASE_ID }}
      - uses: actions/upload-artifact@v2
        if: always()
        with:
          name: csv-files
          path: '**/*.csv'      

```

#### FoD Inputs

**`fod_base_url`**  
*Required* The base URL for the Fortify on Demand instance where your data resides, for example `https://ams.fortify.com` or `https://emea.fortify.com`

**`fod_tenant` + `fod_user` + `fod_password` OR `fod_client_id` + `fod_client_secret`**  
*Required* Credentials for authenticating to Fortify on Demand. Strongly recommend use of GitHub Secrets for credential management.  Personal Access Tokens require the `view-apps` and  `view-issues` API scopes.  Client credentials require the `Read Only` (or higher) role.

**`fod_release_id` OR `fod_release_name`**  
*Required* The target FoD application release ID or name to pull SAST issues from. When specifying an application release name, it must be in the format `<application name>:<release name>`.

**`export_config`**  
*Optional* FortifyVulnerabilityExporter configuration file to use. This can point to any of the standard configuration files shipped with FortifyVulnerabilityExporter using the relative `config` path, for example `config/FoDToGitHub.yml`. To use to a custom configuration file located in your workspace, you can use the standard `GITHUB_WORKSPACE` variable, for example `$GITHUB_WORKSPACE/MyCustomExportConfig.yml`. If not specified, the configuration file to use is determined based on the `export_target` input parameter described below.

**`export_target`**  
*Optional* Output format or system to export to. This input parameter is ignored if the `export_config` input parameter is defined. This input parameter supports any of the export targets for which a corresponding `FoDTo<export_target>.yml` is shipped with FortifyVulnerabilityExporter. The value of the `export_target` input parameter is case-sensitive when running on a platform with case-sensitive file names. Based on the FortifyVulnerabilityExporter version available at the time of writing, the following export targets are supported:

* CSV
* GitHub (default)
* GitLab
* GitLabDAST
* GitLabSAST
* JsonCustom
* JsonRaw
* SonarQube

**`export_dir`**  
*Optional* The directory where generated output file(s) will be stored, defaults to `${GITHUB_WORKSPACE}`. This should be an absolute path.

**Other FortifyVulnerabilityExporter configuration options**  
As described in the FortifyVulnerabilityExporter [Configuration Sources](https://github.com/fortify/FortifyVulnerabilityExporter#configuration-sources) documentation section, configuration options can be specified through environment variables. As such, you can use the [`jobs.<job_id>.steps[*].env`](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstepsenv) property in yor GitHub workflow to specify or override any FortifyVulnerabilityExporter configuration options for which no standard input parameter is available. Alternatively, you can provide customized configuration options in a custom configuration file specified through the `export_config` input parameter.

### Export SSC vulnerability data

#### SSC to GitHub Code Scanning Alerts

This example workflow demonstrates how to export vulnerability data from SSC into GitHub Code Scanning Alerts.

```yaml
name: Import SSC SAST Results
on: [workflow dispatch]
      
jobs:                                                  
  Import-SSC-SAST:
    runs-on: ubuntu-latest

    steps:
      # Pull SAST issues from Fortify on Demand and generate GitHub-optimized SARIF output
      - name: Export Results
        uses: fortify/gha-export-vulnerabilities@v1
        with:
          ssc_base_url: ${{ secrets.SSC_BASE_URL }}
          ssc_auth_token: ${{ secrets.SSC_AUTHTOKEN_DECODED }}
          ssc_version_id: ${{ secrets.SSC_VERSION_ID }}
      
      # Import Fortify SAST results to GitHub Security Code Scanning
      - name: Import Results
        uses: github/codeql-action/upload-sarif@v1
        with:
          sarif_file: ./gh-fortify-sast.sarif

```

#### SSC Considerations

* Issues that are suppressed or hidden in SSC are ignored.
* SARIF is designed specifically for SAST findings, so the GitHub/SARIF output does not include Dynamic (DAST), Mobile (MAST) and Open Source/Software Composition (OSS/SCA) issues.
* GitHub Code Scanning currently supports SARIF files with up to 1,000 issues. If the SSC application version contains more than 1,000 issues, this action will abort. Consider creating a dedicated filter set on SSC that produces less than 1,000 issues, in combination with the `ssc_vuln_filter_set_id` option.

#### SSC to other output formats

This example workflow demonstrates how to export vulnerability data from SSC to a CSV file and then archive the generated CSV file as an artifact. The description for the `export_target` input parameter in the [SSC Inputs](#ssc-inputs) section lists the supported export targets.

```yaml
name: Export SSC Results to CSV
on: [workflow dispatch]
      
jobs:                                                  
  Export-SSC-To-CSV:
    runs-on: ubuntu-latest

    steps:
      # Pull SAST issues from Fortify SSC and generate CSV output
      - name: Export Results
        uses: fortify/gha-export-vulnerabilities@v1
        with:
          export_target: CSV
          ssc_base_url: ${{ secrets.SSC_BASE_URL }}
          ssc_auth_token: ${{ secrets.SSC_AUTHTOKEN_DECODED }}
          ssc_version_id: ${{ secrets.SSC_VERSION_ID }}
      - uses: actions/upload-artifact@v2
        if: always()
        with:
          name: csv-files
          path: '**/*.csv'      
          
```

#### SSC Inputs

**`ssc_base_url`**  
*Required* The base URL for the Fortify Software Security Center instance where your data resides.

**`ssc_auth_token` OR `ssc_user` + `ssc_password`**  
*Required* Credentials for authenticating to Software Security Center. Strongly recommend use of GitHub Secrets for credential management.  Use a `CI Token` if you wish to use token-based authentication.

**`ssc_version_id` OR `ssc_version_name`**  
*Required* The target SSC application version ID or name to pull SAST issues from. When specifying an application version name, it must be in the format `<application name>:<version name>`.

**`ssc_vuln_filter_set_id`**  
*Optional* ID of the SSC filter set from which to pull SAST issues.

**`export_config`**  
*Optional* FortifyVulnerabilityExporter configuration file to use. This can point to any of the standard configuration files shipped with FortifyVulnerabilityExporter using the relative `config` path, for example `config/SSCToGitHub.yml`. To use to a custom configuration file located in your workspace, you can use the standard `GITHUB_WORKSPACE` variable, for example `$GITHUB_WORKSPACE/MyCustomExportConfig.yml`. If not specified, the configuration file to use is determined based on the `export_target` input parameter described below.

**`export_target`**  
*Optional* Output format or system to export to. This input parameter is ignored if the `export_config` input parameter is defined. This input parameter supports any of the export targets for which a corresponding `SSCTo<export_target>.yml` is shipped with FortifyVulnerabilityExporter. The value of the `export_target` input parameter is case-sensitive when running on a platform with case-sensitive file names. Based on the FortifyVulnerabilityExporter version available at the time of writing, the following export targets are supported:

* CSV
* GitHub (default)
* GitLab
* GitLabDAST
* GitLabSAST
* GitLabSonatype
* JsonCustom
* JsonRaw
* SonarQube

**`export_dir`**  
*Optional* The directory where generated output file(s) will be stored, defaults to `${GITHUB_WORKSPACE}`. This should be an absolute path.

**Other FortifyVulnerabilityExporter configuration options**  
As described in the FortifyVulnerabilityExporter [Configuration Sources](https://github.com/fortify/FortifyVulnerabilityExporter#configuration-sources) documentation section, configuration options can be specified through environment variables. As such, you can use the [`jobs.<job_id>.steps[*].env`](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstepsenv) property in yor GitHub workflow to specify or override any FortifyVulnerabilityExporter configuration options for which no standard input parameter is available. Alternatively, you can provide customized configuration options in a custom configuration file specified through the `export_config` input parameter.