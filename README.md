# Deprecation Notice

This GitHub Action has been deprecated and will no longer be maintained as of December 31st, 2023. Similar functionality is now available through the consolidated [fortify/github-action](https://github.com/marketplace/actions/fortify-ast-scan) and its sub-actions; please update your GitHub workflows to use these actions instead.

# Export Fortify vulnerability data

Build secure software fast with [Fortify](https://www.microfocus.com/en-us/solutions/application-security). Fortify offers end-to-end application security solutions with the flexibility of testing on-premises and on-demand to scale and cover the entire software development lifecycle.  With Fortify, find security issues early and fix at the speed of DevOps. 

This GitHub Action utilizes [FortifyVulnerabilityExporter](https://github.com/fortify/FortifyVulnerabilityExporter) to export Fortify vulnerability data from either Fortify on Demand (FoD) or Fortify Software Security Center (SSC) to various output formats or other systems. In the GitHub ecosystem, the default use case for this action is to export Fortify SAST results to GitHub's Security Code Scanning Alerts. Apart from this default use case, this GitHub Action also supports any of the other export targets provided by FortifyVulnerabilityExporter.

## Table of Contents

* [Requirements](#requirements)
    * [FoD or SSC instance](#fod-or-ssc-instance)
    * [Network connectivity](#network-connectivity)
    * [Java](#java)
* [Usage](#usage)
    * [Export FoD vulnerability data](#export-fod-vulnerability-data)
        * [FoD to GitHub Code Scanning Alerts](#fod-to-github-code-scanning-alerts)
        * [FoD to other output formats](#fod-to-other-output-formats)
        * [FoD Inputs](#fod-inputs)
    * [Export SSC vulnerability data](#export-ssc-vulnerability-data)
        * [SSC to GitHub Code Scanning Alerts](#ssc-to-github-code-scanning-alerts)
        * [SSC to other output formats](#ssc-to-other-output-formats)
        * [SSC Inputs](#ssc-inputs)
* [Docker-based alternative](#docker-based-alternative)
* [Information for Developers](#information-for-developers)

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
This GitHub Action requires Java to be installed on the GitHub Runner. At the time of writing, all GitHub-hosted runners provide one or more Java installations, but FortifyVulnerabilityExporter may not have been tested with the Java versions provided by a specific runner. If you want to run this action on a GitHub Runner that does not have Java installed, or if you want to use a specific Java version for running FortifyVulnerabilityExporter, you can use the [setup-java](https://github.com/actions/setup-java) action before using the `gha-export-vulnerabilities` action. Alternatively you can use the [FortifyVulnerabilityExporter Docker image](#docker-based-alternative) in your workflows, as this does not require an appropriate Java version to be installed on the GitHub Runner.

## Usage

The primary use case for this action is after completion of a Fortify SAST scan. See the [Fortify ScanCentral Scan](https://github.com/marketplace/actions/fortify-scancentral-scan) and [Fortify on Demand Scan](https://github.com/marketplace/actions/fortify-on-demand-scan) actions for more details on how to initiate SAST scans on Fortify ScanCentral SAST or Fortify on Demand in your GitHub Actions workflow. Note that some export targets may also support other scan types like Dynamic (DAST), Mobile (MAST) and Open Source/Software Composition (OSS/SCA) issues; please see the relevant documentation for running such scans before invoking this action.

The sections below list sample workflows and related information for exporting vulnerability data from respectively FoD or SSC into GitHub Security Code Scanning Alerts or to other export targets. Additional sample workflows implementing this and other Fortify actions can be found in the following repositories:
  * [EightBall sample workflows](https://github.com/fortify/gha-sample-workflows-eightball/tree/master/.github/workflows)
  * [ssc-js-sandbox sample workflows](https://github.com/fortify/gha-sample-workflows-ssc-js-sandbox/tree/master/.github/workflows)
  * [WebGoat 7.1 sample workflows](https://github.com/fortify/gha-sample-workflows-WebGoat-7.1/tree/master/.github/workflows)
  * [WebGoat.NET sample workflows](https://github.com/fortify/gha-sample-workflows-WebGoat.NET/tree/master/.github/workflows)

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
If you need to customize any options that are not available as action input parameters, you can do so using one of the following approaches:

* Use the [`jobs.<job_id>.steps[*].env`](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstepsenv) property in your GitHub workflow; FortifyVulnerabilityExporter allows for reading configuration properties from environment variables as described in the FortifyVulnerabilityExporter [Configuration Sources](https://github.com/fortify/FortifyVulnerabilityExporter#configuration-sources) section
* Provide a customized configuration file specified through the `export_config` input parameter
* Use the [FortifyVulnerabilityExporter Docker image](#docker-based-alternative) in your workflows

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
If you need to customize any options that are not available as action input parameters, you can do so using one of the following approaches:

* Use the [`jobs.<job_id>.steps[*].env`](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstepsenv) property in your GitHub workflow; FortifyVulnerabilityExporter allows for reading configuration properties from environment variables as described in the FortifyVulnerabilityExporter [Configuration Sources](https://github.com/fortify/FortifyVulnerabilityExporter#configuration-sources) section
* Provide a customized configuration file specified through the `export_config` input parameter
* Use the [FortifyVulnerabilityExporter Docker image](#docker-based-alternative) in your workflows

## Docker-based alternative
[FortifyVulnerabilityExporter](https://github.com/fortify/FortifyVulnerabilityExporter) is also available as a Docker image. As GitHub allows for using Docker images in a similar way as regular GitHub Actions, it is very easy to use the [FortifyVulnerability Docker images](https://hub.docker.com/repository/docker/fortifydocker/fortify-vulnerability-exporter) in your workflows instead of the `gha-export-vulnerabilities` action. As both this GitHub action and the Docker image run the same FortifyVulnerabilityExporter implementation, even most of the input parameters are the same. Following is an example on how to export FoD vulnerabilities to a GitHub-optimized SARIF file using the Docker image in a GitHub Actions workflow:

```
      - uses: docker://fortifydocker/fortify-vulnerability-exporter:latest
        with:
          export_config: /config/FoDToGitHub.yml
          fod_baseUrl: ${{ secrets.FOD_EIGHTBALL_BASE_URL }}
          fod_tenant: ${{ secrets.FOD_EIGHTBALL_TENANT }}
          fod_userName: ${{ secrets.FOD_EIGHTBALL_USER }}
          fod_password: ${{ secrets.FOD_EIGHTBALL_PAT }}
          fod_release_id: ${{ secrets.FOD_EIGHTBALL_RELEASE_ID }}
```

As you can see, this is very similar to the `gha-export-vulnerabilities` step shown in the [FoD to GitHub Code Scanning Alerts](#fod-to-github-code-scanning-alerts) section. The main differences between the Docker image and the `gha-export-vulnerabilities` action are as follows:

| Docker Image | GitHub Action |
| ------------ | ------------- |
| Requires a Linux-based runner | Can run on any platform where Java is available |
| Requires Docker to be installed on the runner | Requires Java to be installed on the runner |
| Requires explicit `export_config` option | Exports to GitHub-optimized SARIF by default |
| Doesn't support the `export_target` option | Automatically selects between FoD or SSC configuration files for a configured `export_target`  |
| All configuration options can be specified in the `with:` clause | Only a select subset of configuration options can be specified in the `with:` clause |

## Information for Developers

All commits to the `main` or `master` branch should follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) convention. In particular, commits using the `feat: Some feature` and `fix: Some fix` convention are used to automatically manage version numbers and for updating the [CHANGELOG.md](https://github.com/fortify/gha-export-vulnerabilities/blob/master/CHANGELOG.md) file.

Whenever changes are pushed to the `main` or `master` branch, the [`.github/workflows/publish-release.yml`](https://github.com/fortify/gha-export-vulnerabilities/blob/master/.github/workflows/publish-release.yml) workflow will be triggered. If there have been any commits with the `feat:` or `fix:` prefixes, the [`release-please-action`](https://github.com/google-github-actions/release-please-action) will generate a pull request with the appropriate changes to the CHANGELOG.md file and version number in `package.json`. If there is already an existing pull request, based on earlier feature or fix commits, the pull request will be updated.

Once the pull request is accepted, the `release-please-action` will publish the new release to the GitHub Releases page and tag it with the appropriate `v{major}.{minor}.{patch}` tag. The two `richardsimko/update-tag` action instances referenced in the `publish-release.yml` workflow will create or update the appropriate `v{major}.{minor}` and `v{major}` tags, allowing users to reference the action by major, minor or patch version.
