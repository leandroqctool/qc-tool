#!/usr/bin/env bash

# QC Tool - Production Deployment Script
# This script handles the complete deployment process for the QC Tool

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="qc-tool"
VERCEL_PROJECT_NAME="qc-tool-production"
REQUIRED_NODE_VERSION="18"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

check_dependencies() {
    log "Checking dependencies..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
        error "Node.js version $REQUIRED_NODE_VERSION or higher is required. Current: $(node -v)"
    fi
    success "Node.js version check passed"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    success "npm check passed"
    
    # Check Vercel CLI
    if ! command -v vercel &> /dev/null; then
        warning "Vercel CLI not found. Installing..."
        npm install -g vercel@latest
    fi
    success "Vercel CLI check passed"
    
    # Check git
    if ! command -v git &> /dev/null; then
        error "git is not installed"
    fi
    success "git check passed"
}

check_environment() {
    log "Checking environment variables..."
    
    # Required environment variables
    REQUIRED_VARS=(
        "DATABASE_URL"
        "DATABASE_URL_UNPOOLED"
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
        "R2_ENDPOINT"
        "R2_BUCKET"
        "R2_ACCESS_KEY_ID"
        "R2_SECRET_ACCESS_KEY"
        "R2_PUBLIC_BASE_URL"
    )
    
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var:-}" ]; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -ne 0 ]; then
        error "Missing required environment variables: ${MISSING_VARS[*]}"
    fi
    
    success "Environment variables check passed"
}

run_tests() {
    log "Running test suite..."
    
    # Install dependencies
    npm ci --prefer-offline --no-audit
    
    # Run linting
    log "Running ESLint..."
    npm run lint
    success "Linting passed"
    
    # Run type checking
    log "Running TypeScript type check..."
    npx tsc --noEmit
    success "Type checking passed"
    
    # Run unit tests
    log "Running unit tests..."
    npm run test:ci
    success "Unit tests passed"
    
    # Run build test
    log "Testing production build..."
    npm run build
    success "Production build test passed"
}

check_security() {
    log "Running security checks..."
    
    # Check for security vulnerabilities
    log "Checking for npm vulnerabilities..."
    npm audit --audit-level=high
    success "Security audit passed"
    
    # Check for secrets in code
    log "Checking for exposed secrets..."
    if grep -r "sk_" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" .; then
        error "Potential API keys found in code"
    fi
    success "Secret scan passed"
}

deploy_to_vercel() {
    log "Deploying to Vercel..."
    
    # Login to Vercel (if not already logged in)
    if ! vercel whoami &> /dev/null; then
        log "Please login to Vercel:"
        vercel login
    fi
    
    # Set environment variables in Vercel
    log "Setting environment variables..."
    vercel env add DATABASE_URL production <<< "$DATABASE_URL"
    vercel env add DATABASE_URL_UNPOOLED production <<< "$DATABASE_URL_UNPOOLED"
    vercel env add NEXTAUTH_SECRET production <<< "$NEXTAUTH_SECRET"
    vercel env add NEXTAUTH_URL production <<< "$NEXTAUTH_URL"
    vercel env add R2_ENDPOINT production <<< "$R2_ENDPOINT"
    vercel env add R2_BUCKET production <<< "$R2_BUCKET"
    vercel env add R2_ACCESS_KEY_ID production <<< "$R2_ACCESS_KEY_ID"
    vercel env add R2_SECRET_ACCESS_KEY production <<< "$R2_SECRET_ACCESS_KEY"
    vercel env add R2_PUBLIC_BASE_URL production <<< "$R2_PUBLIC_BASE_URL"
    
    # Deploy to production
    log "Deploying to production..."
    vercel --prod --yes
    
    success "Deployment completed successfully"
}

run_post_deployment_tests() {
    log "Running post-deployment tests..."
    
    # Get deployment URL
    DEPLOYMENT_URL=$(vercel ls --scope="$VERCEL_PROJECT_NAME" | grep production | head -1 | awk '{print $2}')
    
    if [ -z "$DEPLOYMENT_URL" ]; then
        warning "Could not determine deployment URL, skipping post-deployment tests"
        return
    fi
    
    log "Testing deployment at: https://$DEPLOYMENT_URL"
    
    # Test health endpoint
    log "Testing health endpoint..."
    HEALTH_RESPONSE=$(curl -s -w "%{http_code}" "https://$DEPLOYMENT_URL/api/health" -o /dev/null)
    
    if [ "$HEALTH_RESPONSE" -eq 200 ]; then
        success "Health check passed"
    else
        error "Health check failed with status: $HEALTH_RESPONSE"
    fi
    
    # Test main page
    log "Testing main page..."
    MAIN_RESPONSE=$(curl -s -w "%{http_code}" "https://$DEPLOYMENT_URL" -o /dev/null)
    
    if [ "$MAIN_RESPONSE" -eq 200 ] || [ "$MAIN_RESPONSE" -eq 302 ]; then
        success "Main page test passed"
    else
        error "Main page test failed with status: $MAIN_RESPONSE"
    fi
}

cleanup() {
    log "Cleaning up..."
    
    # Remove build artifacts if needed
    # rm -rf .next
    
    success "Cleanup completed"
}

main() {
    log "Starting deployment process for $PROJECT_NAME..."
    
    # Pre-deployment checks
    check_dependencies
    check_environment
    
    # Testing phase
    run_tests
    check_security
    
    # Deployment phase
    deploy_to_vercel
    
    # Post-deployment verification
    run_post_deployment_tests
    
    # Cleanup
    cleanup
    
    success "🎉 Deployment completed successfully!"
    log "Your application is now live in production."
    log "Monitor the deployment at: https://vercel.com/dashboard"
}

# Handle script termination
trap 'error "Deployment interrupted"' INT TERM

# Check if running in CI environment
if [ "${CI:-false}" = "true" ]; then
    log "Running in CI environment"
    export VERCEL_ORG_ID="${VERCEL_ORG_ID:-}"
    export VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-}"
fi

# Run main function
main "$@"
