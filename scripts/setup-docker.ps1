# setup-docker.ps1 — Auto-detect and install Docker Desktop if missing
# Called by GRC Desktop installer during post-install phase
# Exit codes: 0=Docker ready, 1=Install failed, 2=User cancelled

param(
    [switch]$Silent
)

$ErrorActionPreference = "SilentlyContinue"

# ── Step 1: Check if Docker is already available ─────────────────────────
function Test-DockerAvailable {
    $dockerPath = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerPath) {
        try {
            $version = & docker --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[Docker] Found: $version" -ForegroundColor Green
                return $true
            }
        } catch {}
    }

    # Check common install locations
    $paths = @(
        "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe",
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "${env:LOCALAPPDATA}\Programs\Docker\Docker\resources\bin\docker.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) {
            Write-Host "[Docker] Found at: $p" -ForegroundColor Green
            return $true
        }
    }

    # Check if Docker Desktop is installed via registry
    $regPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop"
    )
    foreach ($rp in $regPaths) {
        if (Test-Path $rp) {
            Write-Host "[Docker] Docker Desktop is installed (registry)" -ForegroundColor Green
            return $true
        }
    }

    return $false
}

# ── Step 2: Check WSL2 availability ──────────────────────────────────────
function Test-WSL2Available {
    try {
        $wslOutput = & wsl --status 2>&1
        if ($LASTEXITCODE -eq 0) { return $true }
    } catch {}

    # Check if WSL feature is enabled
    $wslFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -ErrorAction SilentlyContinue
    return ($wslFeature -and $wslFeature.State -eq "Enabled")
}

# ── Step 3: Download and install Docker Desktop ──────────────────────────
function Install-DockerDesktop {
    $installerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    $installerPath = Join-Path $env:TEMP "DockerDesktopInstaller.exe"

    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Docker Desktop is required for GRC node management     ║" -ForegroundColor Cyan
    Write-Host "║  Downloading Docker Desktop installer...                ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    try {
        Write-Host "[Docker] Downloading from $installerUrl ..." -ForegroundColor Yellow

        # Use BITS for reliable download with progress
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing

        if (-not (Test-Path $installerPath)) {
            Write-Host "[Docker] Download failed" -ForegroundColor Red
            return $false
        }

        $fileSize = (Get-Item $installerPath).Length / 1MB
        Write-Host "[Docker] Downloaded: $([math]::Round($fileSize, 1)) MB" -ForegroundColor Green

    } catch {
        Write-Host "[Docker] Download failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }

    # Run installer
    Write-Host "[Docker] Installing Docker Desktop (this may take a few minutes)..." -ForegroundColor Yellow

    try {
        $installArgs = "install --quiet --accept-license"

        # If WSL2 not available, use Hyper-V backend
        if (-not (Test-WSL2Available)) {
            Write-Host "[Docker] WSL2 not detected, will use Hyper-V backend" -ForegroundColor Yellow
            $installArgs += " --backend=hyper-v"
        } else {
            $installArgs += " --backend=wsl-2"
        }

        $process = Start-Process -FilePath $installerPath -ArgumentList $installArgs -Wait -PassThru

        if ($process.ExitCode -eq 0) {
            Write-Host "[Docker] Docker Desktop installed successfully!" -ForegroundColor Green

            # Clean up installer
            Remove-Item $installerPath -Force -ErrorAction SilentlyContinue

            return $true
        } else {
            Write-Host "[Docker] Installation exited with code: $($process.ExitCode)" -ForegroundColor Red
            return $false
        }

    } catch {
        Write-Host "[Docker] Installation failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# ── Main ─────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "[GRC Setup] Checking Docker environment..." -ForegroundColor Cyan

if (Test-DockerAvailable) {
    Write-Host "[GRC Setup] Docker is already installed. Skipping installation." -ForegroundColor Green
    exit 0
}

Write-Host "[GRC Setup] Docker not found on this system." -ForegroundColor Yellow

if (-not $Silent) {
    $response = [System.Windows.Forms.MessageBox]::Show(
        "Docker Desktop is required for GRC to manage AI agent nodes.`n`nWould you like to install Docker Desktop now?`n`n(You can also install it later from https://docker.com)",
        "GRC - Docker Setup",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )

    if ($response -eq [System.Windows.Forms.DialogResult]::No) {
        Write-Host "[GRC Setup] Docker installation skipped by user." -ForegroundColor Yellow
        Write-Host "[GRC Setup] You can install Docker Desktop later from https://docker.com" -ForegroundColor Yellow
        exit 2
    }
}

# Install Docker Desktop
$success = Install-DockerDesktop

if ($success) {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  Docker Desktop installed successfully!                  ║" -ForegroundColor Green
    Write-Host "║                                                          ║" -ForegroundColor Green
    Write-Host "║  Please restart your computer to complete setup.          ║" -ForegroundColor Green
    Write-Host "║  Docker Desktop will start automatically after reboot.   ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "[GRC Setup] Docker installation failed." -ForegroundColor Red
    Write-Host "[GRC Setup] Please install Docker Desktop manually: https://docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}
