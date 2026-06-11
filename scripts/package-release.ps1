param(
    [string]$OutputZip = "..\rd1backupublive-final-2.0.zip"
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspace = Resolve-Path "$root\.."

Write-Host "Packaging release from $workspace to $OutputZip"

if (Test-Path $OutputZip) {
    Remove-Item $OutputZip -Force
}

# Exclusions that must never ship
$exclude = @(
    '.git',
    '.env',
    '.env.*',
    'node_modules',
    'postgres-data',
    'headscale-data',
    'android-sdk',
    '*.apk',
    '*.idsig',
    '__pycache__',
    '*.pyc',
    '.tmp',
    '.temp',
    '*.log'
)

# Build exclusion regex
$excludeRegex = ($exclude | ForEach-Object { [regex]::Escape($_) + '(\.|$)' }) -join '|'

$items = Get-ChildItem -Path $workspace -Force | Where-Object {
    $name = $_.Name
    -not ($name -match $excludeRegex)
}

Compress-Archive -Path $items.FullName -DestinationPath $OutputZip -Force
Write-Host "Release archive created: $OutputZip"
