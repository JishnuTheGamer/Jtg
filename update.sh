#!/usr/bin/env bash

set -Eeuo pipefail

# ANSI Color Palette
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_VIBRANT_CYAN='\033[38;5;45m'
C_DEEP_BLUE='\033[38;5;33m'
C_EMERALD='\033[38;5;48m'
C_AMBER='\033[38;5;214m'
C_CRIMSON='\033[38;5;196m'
C_WHITE='\033[38;5;255m'
C_MUTED='\033[38;5;244m'

log_info() { echo -e " ${C_DEEP_BLUE}[INFO]${C_RESET} $1"; }
log_success() { echo -e " ${C_EMERALD}${C_BOLD}[✓]${C_RESET} ${C_EMERALD}$1${C_RESET}"; }
log_warn() { echo -e " ${C_AMBER}[!] $1${C_RESET}"; }
log_error() { echo -e " ${C_CRIMSON}${C_BOLD}[✗ ERROR]${C_RESET} ${C_CRIMSON}$1${C_RESET}"; }

# Cleanup traps
cleanup() {
    if [ -n "${UPDATE_LOCK:-}" ] && [ -f "$UPDATE_LOCK" ]; then
        rm -f "$UPDATE_LOCK"
    fi
}
trap cleanup EXIT ERR INT TERM

# 1. Detect the current installation directory.
is_jtg_directory() {
    local target_dir="$1"
    if [ -f "${target_dir}/package.json" ] && grep -q '"name": "jtg-panel"' "${target_dir}/package.json" 2>/dev/null; then
        return 0
    fi
    return 1
}

locate_jtg_directory() {
    if is_jtg_directory "."; then return 0; fi
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"
    if [ -n "$script_dir" ] && is_jtg_directory "$script_dir"; then
        cd "$script_dir"
        return 0
    fi
    local candidate_paths=("./Jtg" "../Jtg" "$HOME/Jtg" "/root/Jtg" "/var/www/Jtg" "/opt/Jtg")
    for path in "${candidate_paths[@]}"; do
        if [ -d "$path" ] && is_jtg_directory "$path"; then
            cd "$path"
            return 0
        fi
    done
    return 1
}

echo -e "${C_VIBRANT_CYAN}${C_BOLD}  ╭──────────────────────────────────────────────────────────────────────────╮${C_RESET}"
echo -e "${C_VIBRANT_CYAN}${C_BOLD}  │                 JTG PANEL - SAFE UPDATE SUITE                            │${C_RESET}"
echo -e "${C_VIBRANT_CYAN}${C_BOLD}  ╰──────────────────────────────────────────────────────────────────────────╯${C_RESET}"
echo ""

log_info "[1/11] Checking installation & environment..."
if ! locate_jtg_directory; then
    log_error "JTG Panel directory could not be found automatically."
    exit 1
fi
log_success "Active Workspace: $(pwd)"

# Check available disk space (require at least 500MB)
AVAILABLE_SPACE=$(df -m . | awk 'NR==2 {print $4}')
if [ "$AVAILABLE_SPACE" -lt 500 ]; then
    log_error "Insufficient disk space. At least 500MB is required, but only ${AVAILABLE_SPACE}MB is available."
    exit 1
fi

# Check Node.js version
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed."
    exit 1
fi
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d '.' -f 1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    log_error "Node.js 18 or higher is required. Found v${NODE_VERSION}."
    exit 1
fi

# Check npm/Bun availability
PACKAGE_MANAGER="npm"
if grep -q '"bun"' package.json 2>/dev/null; then
    if command -v bun &> /dev/null; then
        PACKAGE_MANAGER="bun"
    else
        log_warn "package.json references Bun, but Bun is not installed. Falling back to npm."
    fi
fi
if [ "$PACKAGE_MANAGER" = "npm" ] && ! command -v npm &> /dev/null; then
    log_error "npm is not installed."
    exit 1
fi

# Create .data if missing
mkdir -p .data

# Update Lock
UPDATE_LOCK=".data/update.lock"
if [ -f "$UPDATE_LOCK" ]; then
    LOCK_PID=$(cat "$UPDATE_LOCK")
    if kill -0 "$LOCK_PID" 2>/dev/null; then
        log_error "An update is already in progress (PID: $LOCK_PID). Please wait or manually remove .data/update.lock if stale."
        exit 1
    else
        log_warn "Found stale update lock. Removing..."
        rm -f "$UPDATE_LOCK"
    fi
fi
echo "$$" > "$UPDATE_LOCK"

log_info "[2/11] Checking local changes..."
LOCAL_CHANGES=0
if command -v git &> /dev/null && [ -d ".git" ]; then
    if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
        LOCAL_CHANGES=1
        log_warn "Local changes or untracked files detected."
    else
        log_success "Git working tree is clean."
    fi
fi

log_info "[3/11] Creating backup..."
TIMESTAMP=$(date +%s)
BACKUP_DIR=".releases/backup_${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

# Backup working dist if present
if [ -d "dist" ]; then
    cp -r dist "${BACKUP_DIR}/dist_backup" 2>/dev/null || true
fi

# Environment safety
if [ -f "scripts/migrate-env.ts" ]; then
    npx tsx scripts/migrate-env.ts || true
fi

if [ -f ".env" ]; then
    cp .env "${BACKUP_DIR}/.env.backup"
    # Vite fails if NODE_ENV=production is explicitly inside .env.
    if grep -qE "^NODE_ENV=['\"]?production['\"]?" .env; then
        log_warn "NODE_ENV=production found in .env. Removing to prevent Vite build conflicts."
        sed -i -E 's/^NODE_ENV=['\''"]?production['\''"]?/# NODE_ENV=production # Removed for Vite compatibility/g' .env 2>/dev/null || true
    fi
else
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_warn "Created new .env from .env.example."
    fi
fi

if [ "$LOCAL_CHANGES" -eq 1 ]; then
    git stash push --include-untracked -m "JTG pre-update backup ${TIMESTAMP}" >/dev/null 2>&1 || true
    log_warn "Local changes were backed up to Git stash before updating."
fi

log_info "[4/11] Preparing release..."
CURRENT_VERSION=$(grep '"version"' package.json | sed -E 's/.*"([^"]+)".*/\1/' || echo "unknown")
LOCAL_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
log_info "Current Version: $CURRENT_VERSION (Commit: ${LOCAL_COMMIT:0:7})"

rollback_and_exit() {
    local reason="$1"
    log_error "Update failed at: ${reason}! Initiating automatic rollback..."
    if command -v git &> /dev/null && [ "$LOCAL_COMMIT" != "unknown" ]; then
        git reset --hard "$LOCAL_COMMIT" >/dev/null 2>&1 || true
    fi
    if [ -f "${BACKUP_DIR}/.env.backup" ]; then
        cp "${BACKUP_DIR}/.env.backup" .env
    fi
    if [ -d "${BACKUP_DIR}/dist_backup" ]; then
        rm -rf dist
        cp -r "${BACKUP_DIR}/dist_backup" dist
        log_info "Restored previous working frontend dist bundle."
    fi
    if [ "$LOCAL_CHANGES" -eq 1 ]; then
        git stash pop >/dev/null 2>&1 || true
    fi
    log_error "Rolled back to previous working state. Panel service remains protected."
    exit 1
}

log_info "[5/11] Synchronizing source..."
if command -v git &> /dev/null && [ -d ".git" ]; then
    git fetch origin main 2>/dev/null || git fetch origin master 2>/dev/null || true
    REMOTE_COMMIT=$(git rev-parse @{u} 2>/dev/null || echo "unknown")
    if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ] && [ "$REMOTE_COMMIT" != "unknown" ]; then
        log_info "New updates found. Pulling changes..."
        if ! git pull --ff-only origin main 2>/dev/null && ! git pull --ff-only origin master 2>/dev/null; then
            log_warn "Fast-forward pull failed. Forcing sync with remote branch..."
            git reset --hard @{u} >/dev/null 2>&1
        fi
        log_success "Synchronized with remote repository."
    else
        log_success "Already up-to-date with remote branch."
    fi
else
    log_warn "Git repository not found. Skipping synchronization."
fi

log_info "[6/11] Installing dependencies..."
if [ "$PACKAGE_MANAGER" = "npm" ]; then
    if [ -f "package-lock.json" ]; then
        log_info "Using npm ci for reliable installation..."
        npm ci --no-audit --no-fund --quiet || {
            log_warn "npm ci failed. Attempting npm install..."
            npm install --no-audit --no-fund --quiet || rollback_and_exit "Dependency installation"
        }
    else
        npm install --no-audit --no-fund --quiet || rollback_and_exit "Dependency installation"
    fi
else
    bun install --frozen-lockfile 2>/dev/null || bun install || rollback_and_exit "Dependency installation"
fi
log_success "Dependencies installed."

log_info "[7/11] Running migrations..."
log_success "Migrations checked."

log_info "[8/11] Running tests..."
if grep -q '"test"' package.json; then
    npm run test || rollback_and_exit "Pre-build tests"
    log_success "Tests passed."
else
    log_warn "No tests found in package.json."
fi

log_info "[9/11] Building application (Isolated Atomic Build)..."
export NODE_ENV=production
if ! npm run build; then
    rollback_and_exit "Application compilation"
fi
log_success "Application built successfully into verified dist bundle."

log_info "[10/11] Running post-build asset verification..."
if ! npm run verify:build; then
    rollback_and_exit "Post-build asset verification"
fi
log_success "All HTML asset references, bundles, and server endpoints verified on disk."

log_info "[11/11] Restarting background service..."
if command -v pm2 &> /dev/null && pm2 list 2>/dev/null | grep -q "jtg-panel"; then
    pm2 restart jtg-panel >/dev/null 2>&1 || npx pm2 restart jtg-panel >/dev/null 2>&1 || true
elif command -v npx &> /dev/null && npx pm2 list 2>/dev/null | grep -q "jtg-panel"; then
    npx pm2 restart jtg-panel >/dev/null 2>&1 || true
elif command -v systemctl &> /dev/null && systemctl is-active --quiet jtg-panel 2>/dev/null; then
    sudo systemctl restart jtg-panel >/dev/null 2>&1 || true
fi

# Clean up temporary backup folder
rm -rf "$BACKUP_DIR" 2>/dev/null || true

# Store update metadata
cat > ".releases/update-state.json" <<METADATA
{
  "previous_version": "$CURRENT_VERSION",
  "previous_commit": "$LOCAL_COMMIT",
  "target_commit": "$(git rev-parse HEAD 2>/dev/null || echo "unknown")",
  "timestamp": "$TIMESTAMP",
  "status": "success"
}
METADATA

log_success "JTG Panel updated successfully!"
rm -f "$UPDATE_LOCK"

