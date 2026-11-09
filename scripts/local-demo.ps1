param(
  [Parameter(Position = 0)]
  [ValidateSet("build", "check", "start", "status", "stop", "help")]
  [string]$Action = "help",
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Options = @()
)

$ErrorActionPreference = "Stop"
$Workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Workspace
& node (Join-Path $PSScriptRoot "local-demo.mjs") $Action @Options
exit $LASTEXITCODE
