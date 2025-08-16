#!/bin/bash

# Oxl Workspace Automated Setup Script
# This script automates the complete setup process for the Oxl Workspace application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
check_port() {
    if lsof -ti:3000 >/dev/null 2>&1; then
        print_warning "Port 3000 is already in use"
        read -p "Do you want to kill the process using port 3000? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill -9 $(lsof -ti:3000) || true
            print_success "Process killed"
        else
            print_error "Please free up port 3000 and run the script again"
            exit 1
        fi
    fi
}

# Function to generate random secret
generate_secret() {
    openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
}

# Start setup
print_status "Starting Oxl Workspace setup..."

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_success "Prerequisites checked successfully"

# Check if port 3000 is available
check_port

# Install dependencies
print_status "Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Dependencies installed"
else
    print_warning "node_modules already exists, skipping npm install"
fi

# Create environment file
print_status "Setting up environment variables..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        # Create .env file from scratch
        cat > .env << EOF
# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_SECRET="$(generate_secret)"
NEXTAUTH_URL="http://localhost:3000"

# Optional: For production
# NEXTAUTH_URL_INTERNAL="http://localhost:3000"
EOF
    fi
    
    # Update NEXTAUTH_SECRET if it's placeholder
    if grep -q "your-super-secret-key-here" .env; then
        SECRET=$(generate_secret)
        sed -i.bak "s/your-super-secret-key-here/$SECRET/" .env
        rm .env.bak
    fi
    
    print_success "Environment file created"
else
    print_warning ".env file already exists, skipping creation"
fi

# Setup database
print_status "Setting up database..."

# Remove existing database if it exists
if [ -f "dev.db" ]; then
    print_warning "Existing database found, removing it..."
    rm -f dev.db
fi

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

# Push database schema
print_status "Pushing database schema..."
npx prisma db push
print_success "Database schema pushed"

# Check if seed script exists and run it
if npm run --silent db:seed >/dev/null 2>&1; then
    print_status "Running database seed..."
    npm run db:seed
    print_success "Database seeded with test data"
else
    print_warning "No seed script found, skipping database seeding"
fi

# Build the application
print_status "Building application..."
npm run build
print_success "Application built successfully"

# Start development server
print_status "Starting development server..."
print_success "Setup completed successfully!"
print_status "Starting development server on http://localhost:3000"
print_status "Press Ctrl+C to stop the server"

# Start the server in the background
npm run dev &
SERVER_PID=$!

# Wait a moment for server to start
sleep 5

# Test if server is running
if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
    print_success "Server is running and responding to requests"
else
    print_warning "Server might be starting up, please check http://localhost:3000"
fi

# Keep the script running
wait $SERVER_PID