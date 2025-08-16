# Oxl Workspace - Complete Setup Guide

This guide will help you set up the Oxl Workspace application from scratch after cloning the repository.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

## Quick Setup (Automated)

For the fastest setup, run the automated setup script:

```bash
chmod +x setup.sh
./setup.sh
```

This will handle all the steps below automatically.

## Manual Setup Steps

### 1. Clone the Repository

```bash
git clone https://github.com/ancourn/Oxl.git
cd Oxl
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then edit the `.env` file with your configuration:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: For production
# NEXTAUTH_URL_INTERNAL="http://localhost:3000"
```

**Important**: Generate a proper secret for `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Optional: Create seed data (for development)
npm run db:seed
```

### 5. Build the Application

```bash
npm run build
```

### 6. Start Development Server

```bash
npm run dev
```

### 7. Verify Installation

Open your browser and navigate to:
- **Main Application**: http://localhost:3000
- **API Health Check**: http://localhost:3000/api/health

## Troubleshooting

### Common Issues

#### 1. Port 3000 Already in Use
```bash
# Find the process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

#### 2. Database Connection Errors
```bash
# Reset database
rm -f dev.db
npx prisma db push
```

#### 3. Prisma Client Generation Issues
```bash
# Clean and regenerate
rm -rf node_modules/.prisma
npx prisma generate
```

#### 4. NextAuth.js Configuration Issues
Ensure your `.env` file has the correct `NEXTAUTH_URL` and `NEXTAUTH_SECRET`.

#### 5. Build Errors
```bash
# Clean build
rm -rf .next
npm run build
```

### Verification Steps

1. **Check Database**:
   ```bash
   ls -la dev.db
   ```

2. **Check API Endpoints**:
   ```bash
   curl http://localhost:3000/api/health
   ```

3. **Check Application**:
   Open http://localhost:3000 in your browser

## Development Workflow

### Making Changes

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Database Changes**:
   ```bash
   # After modifying prisma/schema.prisma
   npx prisma db push
   ```

3. **Running Tests**:
   ```bash
   npm test
   ```

### Database Management

#### View Database
```bash
# Open database viewer
npx prisma studio
```

#### Reset Database
```bash
# WARNING: This will delete all data
rm -f dev.db
npx prisma db push
npm run db:seed
```

#### Add Test Data
```bash
npm run db:seed
```

## Production Deployment

### Environment Variables for Production

```env
# Production Database
DATABASE_URL="file:./prod.db"

# NextAuth.js
NEXTAUTH_SECRET="your-production-secret"
NEXTAUTH_URL="https://your-domain.com"

# Optional: Additional security
NEXTAUTH_URL_INTERNAL="http://localhost:3000"
```

### Build for Production

```bash
npm run build
npm start
```

## Features Overview

Once set up, you'll have access to:

- 🏠 **Dashboard**: Team statistics and overview
- 📧 **Mail System**: Team-based email management
- 🎥 **Meet**: Video conferencing with real-time chat
- 📄 **Docs**: Collaborative document editing
- 💾 **Drive**: File storage and sharing
- 👥 **Teams**: Team management and collaboration
- 🔔 **Notifications**: Real-time notification system

## Support

If you encounter any issues:

1. Check this guide for troubleshooting steps
2. Review the error messages in the console
3. Check the `dev.log` file for detailed server logs
4. Ensure all environment variables are properly set

## Next Steps

After successful setup:

1. Create your first team
2. Invite team members
3. Explore different features
4. Customize the application to your needs

---

**Happy coding! 🚀**