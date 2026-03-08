# DORA Gap Analyzer - Run script (finds Node.js or Python automatically)
# Usage: .\run-gap-analysis.ps1
#        .\run-gap-analysis.ps1 -PoliciesPath "C:\path\to\policies"

param(
    [string]$PoliciesPath = "",
    [string]$OutputJson = "frontend/dora_gap_output.json"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Find Node.js
$nodePaths = @(
    "node",  # in PATH
    "$env:ProgramFiles\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\node\node.exe",
    "$env:USERPROFILE\nodejs\node.exe",
    "$env:APPDATA\fnm\node-versions\*\installation\node.exe"
)

$nodeExe = $null
foreach ($p in $nodePaths) {
    if ($p -eq "node") {
        $n = Get-Command node -ErrorAction SilentlyContinue
        if ($n) { $nodeExe = "node"; break }
    } elseif (Test-Path $p) {
        $nodeExe = $p
        break
    }
}

# Try fnm's default version
if (-not $nodeExe -and (Test-Path "$env:APPDATA\fnm")) {
    $fnmNode = Get-ChildItem "$env:APPDATA\fnm\node-versions" -Recurse -Filter "node.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($fnmNode) { $nodeExe = $fnmNode.FullName }
}

# Find Python
$pythonPaths = @(
    "python", "py", "python3"
)
$pythonExe = $null
foreach ($p in $pythonPaths) {
    $py = Get-Command $p -ErrorAction SilentlyContinue
    if ($py) { $pythonExe = $py.Source; break }
}

# Run
if ($nodeExe) {
    Write-Host "Using Node.js: $nodeExe"
    $nodeArgs = @("dora_gap_analyzer.js", "--output-json", $OutputJson)
    if ($PoliciesPath) { $nodeArgs = @("dora_gap_analyzer.js", "--policies-path", $PoliciesPath, "--output-json", $OutputJson) }
    & $nodeExe @nodeArgs
} elseif ($pythonExe) {
    Write-Host "Using Python: $pythonExe"
    if ($PoliciesPath) {
        & $pythonExe dora_gap_analyzer.py --policies-path $PoliciesPath --output-json $OutputJson
    } else {
        & $pythonExe dora_gap_analyzer.py --output-json $OutputJson
    }
} else {
    Write-Host "Node.js and Python not found." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:"
    Write-Host "1. Install Node.js (portable): Download from https://nodejs.org and extract to a folder, add to PATH"
    Write-Host "2. Use the browser analyzer: Open frontend\analyze.html in your browser"
    exit 1
}
