param(
    [string]$OutputZip = "..\rd1backupublive-final-2.0.zip"
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspace = Resolve-Path "$root\.."

Write-Host "Packaging release from $workspace to $OutputZip"

if (Test-Path $OutputZip) {
    Remove-Item $OutputZip -Force
}

Compress-Archive -Path (Join-Path $workspace '*') -DestinationPath $OutputZip -Force
Write-Host "Release archive created: $OutputZip"
