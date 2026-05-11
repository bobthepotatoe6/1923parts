# codex_run.ps1
# This script initializes the project, installs dependencies, and runs the Convex & Vite dev servers concurrently.

Write-Host "Initializing 1923parts environment..." -ForegroundColor Cyan

# Check if Bun is installed, else instruct user
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "Bun is not installed or not in PATH." -ForegroundColor Yellow
    Write-Host "Please ensure Bun is installed (https://bun.sh) and available in your PATH to run this project." -ForegroundColor Red
    # Fallback to checking npm if possible, but we'll stick to bun as requested
}

Write-Host "Installing dependencies..." -ForegroundColor Cyan
bun install

Write-Host "Starting Convex Dev Server and Vite Dev Server concurrently..." -ForegroundColor Cyan
# Run both in parallel using Start-Process or just run dev which could be configured in package.json
# Let's use Start-Process for Convex and keep Vite in the foreground

Start-Process bun -ArgumentList "x convex dev" -WindowStyle Normal -PassThru
bun run dev
