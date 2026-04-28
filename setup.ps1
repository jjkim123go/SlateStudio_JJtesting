<#
.SYNOPSIS
    Slate ? One-time environment setup.
.DESCRIPTION
    Checks and installs local prerequisites (Node 24+, Python 3.11+, FFmpeg)
    then installs project dependencies (pip, npm).
    Run once after cloning the repo, then open the repo in VS Code and use
    GitHub Copilot Chat to interact with Slate. Azure AI model deployment is
    handled by the Slate agent on first Azure-backed use ? not by this script.
.EXAMPLE
    .\setup.ps1
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# -- Helpers --------------------------------------------------------------
function Write-Step  { param([string]$msg) Write-Host "  $msg" }
function Write-Ok    { param([string]$msg) Write-Host "  + $msg" -ForegroundColor Green }
function Write-Warn  { param([string]$msg) Write-Host "  ! $msg" -ForegroundColor Yellow }
function Write-Fail  { param([string]$msg) Write-Host "  x $msg" -ForegroundColor Red }

function Test-Command { param([string]$cmd) $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue) }

function Get-SemVer {
    param([string]$raw)
    if ($raw -match '(\d+\.\d+\.\d+)') { return [version]$Matches[1] }
    return $null
}

# -- Banner ---------------------------------------------------------------
Write-Host ""
Write-Host "  +--------------------------------------+" -ForegroundColor Cyan
Write-Host "  |       Slate -- Environment Setup      |" -ForegroundColor Cyan
Write-Host "  +--------------------------------------+" -ForegroundColor Cyan
Write-Host ""

$failed = @()

# -- 1. Node.js 24+ ------------------------------------------------------
Write-Step "Checking Node.js..."
if (Test-Command 'node') {
    $nodeVer = Get-SemVer (node --version 2>&1)
    if ($nodeVer -and $nodeVer.Major -ge 24) {
        Write-Ok "Node.js $nodeVer"
    } else {
        Write-Fail "Node.js $nodeVer found ? v24+ required"
        Write-Warn "Install: winget install OpenJS.NodeJS  or  https://nodejs.org"
        $failed += 'Node.js 24+'
    }
} else {
    Write-Fail "Node.js not found"
    Write-Warn "Install: winget install OpenJS.NodeJS  or  https://nodejs.org"
    $failed += 'Node.js 24+'
}

# -- 2. Python 3.11+ -----------------------------------------------------
Write-Step "Checking Python..."
$pycmd = if (Test-Command 'python') { 'python' } elseif (Test-Command 'python3') { 'python3' } else { $null }
if ($pycmd) {
    $pyVer = Get-SemVer (& $pycmd --version 2>&1)
    if ($pyVer -and $pyVer.Major -eq 3 -and $pyVer.Minor -ge 11) {
        Write-Ok "Python $pyVer"
    } else {
        Write-Fail "Python $pyVer found ? 3.11+ required"
        $failed += 'Python 3.11+'
    }
} else {
    Write-Fail "Python not found"
    Write-Warn "Install: winget install Python.Python.3.12  or  https://python.org"
    $failed += 'Python 3.11+'
}

# -- 3. FFmpeg ------------------------------------------------------------
Write-Step "Checking FFmpeg..."
if (Test-Command 'ffmpeg') {
    $ffVer = Get-SemVer (ffmpeg -version 2>&1 | Select-Object -First 1)
    Write-Ok "FFmpeg $ffVer"
} else {
    Write-Warn "FFmpeg not found ? attempting install via winget..."
    try {
        winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements 2>&1 | Out-Null
        # Refresh PATH for this session
        $env:PATH = [System.Environment]::GetEnvironmentVariable('PATH', 'Machine') + ';' +
                     [System.Environment]::GetEnvironmentVariable('PATH', 'User')
        if (Test-Command 'ffmpeg') {
            Write-Ok "FFmpeg installed"
        } else {
            Write-Warn "FFmpeg installed but not in PATH yet ? restart your terminal after setup"
        }
    } catch {
        Write-Fail "FFmpeg not found and auto-install failed"
        Write-Warn "Install manually: winget install Gyan.FFmpeg  or  https://ffmpeg.org"
        $failed += 'FFmpeg'
    }
}

# -- 4. Azure CLI (optional, for Azure-backed onboarding) ----------------
Write-Step "Checking Azure CLI (optional -- needed for Azure-backed onboarding)..."
if (Test-Command 'az') {
    $azVer = Get-SemVer (az version --query '\"azure-cli\"' -o tsv 2>&1)
    Write-Ok "Azure CLI $azVer"
} else {
    Write-Warn "Azure CLI not found ? the agent will need it for Azure-backed model/resource setup"
    Write-Warn "Install later: winget install Microsoft.AzureCLI"
}

# -- Stop if critical deps missing ---------------------------------------
if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Fail "Missing critical dependencies: $($failed -join ', ')"
    Write-Host "  Install them and re-run .\setup.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "  -- Installing project dependencies --" -ForegroundColor Cyan
Write-Host ""

# -- 5. Python dependencies ----------------------------------------------
Write-Step "Installing Python packages..."
$pythonInstallArgs = @('-m', 'pip', 'install', '--quiet', '-e', '.')
& $pycmd @pythonInstallArgs 2>&1 | Out-Null

$optionalPythonPackages = @(
    'openai',
    'azure-identity',
    'python-pptx',
    'python-docx',
    'openpyxl'
)

try {
    & $pycmd -m pip install --quiet @optionalPythonPackages 2>&1 | Out-Null
    Write-Ok "Project package and optional runtime deps installed"
} catch {
    Write-Warn "Core Slate package installed, but some optional runtime deps failed"
    Write-Warn "Optional packages: $($optionalPythonPackages -join ', ')"
    Write-Warn "You can retry with: $pycmd -m pip install $($optionalPythonPackages -join ' ')"
}

# -- 6. HyperFrames (Node) renderer dependencies -------------------------
Write-Step "Installing HyperFrames renderer dependencies..."
Push-Location (Join-Path $PSScriptRoot 'render')
try {
    if (Test-Path 'pnpm-lock.yaml') {
        if (Test-Command 'pnpm') {
            pnpm install --silent 2>&1 | Out-Null
        } else {
            npm install --silent 2>&1 | Out-Null
        }
    } else {
        npm install --silent 2>&1 | Out-Null
    }
    Write-Ok "HyperFrames dependencies installed"
} finally {
    Pop-Location
}

# -- Done -----------------------------------------------------------------
Write-Host ""
Write-Host "  +--------------------------------------+" -ForegroundColor Green
Write-Host "  |         Setup complete!               |" -ForegroundColor Green
Write-Host "  +--------------------------------------+" -ForegroundColor Green
Write-Host ""
Write-Host "  Next step:" -ForegroundColor White
Write-Host "    Open this repo in VS Code and use GitHub Copilot Chat" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Azure-backed models and related resources may be set up on first use" -ForegroundColor Gray
Write-Host "  after the agent shows you a plan and you approve it." -ForegroundColor Gray
Write-Host ""
