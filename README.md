# 🏢 Oxl Workspace - Complete Team Collaboration Platform

A modern, full-featured workspace platform that brings together teams, documents, meetings, mail, and file sharing in one seamless experience. Built with Next.js 15, TypeScript, and cutting-edge web technologies.

## ✨ Features

### 🏠 Dashboard
- **Team Overview**: Real-time statistics and member activity
- **Mail Summary**: Unread emails and important messages
- **Storage Usage**: Track team storage consumption
- **Subscription Status**: Monitor billing and plan limits

### 📧 Mail System
- **Team-based Email Management**: Multiple mail accounts per team
- **Smart Organization**: Inbox, Sent, Drafts, Trash folders
- **Search & Filter**: Find emails quickly
- **Attachments Support**: Full attachment handling

### 🎥 Meet (Video Conferencing)
- **Real-time Video Meetings**: High-quality video calls
- **Live Chat**: Real-time messaging during meetings
- **Room Management**: Create and manage meeting rooms
- **Participant Control**: Host controls and participant management
- **Socket.IO Integration**: Real-time updates and notifications

### 📄 Document Management
- **Collaborative Editing**: Real-time document collaboration
- **Version Control**: Track document changes and history
- **Comment System**: Team feedback and discussions
- **Rich Text Editor**: Full-featured document editor
- **Share & Export**: Easy sharing and export options

### 💾 Drive (File Management)
- **File Storage**: Secure cloud storage for teams
- **Folder Organization**: Hierarchical file structure
- **Drag & Drop**: Intuitive file management
- **Sharing & Permissions**: Control who can access files
- **Multiple Views**: Grid and list view options

### 👥 Team Management
- **Team Creation**: Create and manage multiple teams
- **Role-based Access**: Owner, Admin, Member roles
- **Member Invitations**: Invite team members via email
- **Subscription Management**: Handle team billing and plans
- **Activity Tracking**: Monitor team engagement

### 🔔 Notification System
- **Real-time Alerts**: Instant notifications for important events
- **Multiple Types**: Document comments, meeting invites, mail alerts
- **Read/Unread Tracking**: Stay on top of important updates
- **NotificationCenter**: Centralized notification management

## 🚀 Technology Stack

### Core Framework
- **⚡ Next.js 15** - React framework with App Router
- **📘 TypeScript 5** - Type-safe development
- **🎨 Tailwind CSS 4** - Utility-first styling
- **🧩 shadcn/ui** - High-quality UI components

### Database & Backend
- **🗄️ Prisma** - Modern ORM with type safety
- **🔐 NextAuth.js** - Authentication solution
- **💾 SQLite** - Lightweight database (development)
- **🔌 Socket.IO** - Real-time communication

### State Management & Data
- **🐻 Zustand** - Lightweight state management
- **🔄 TanStack Query** - Server state management
- **✅ Zod** - Schema validation
- **🎣 React Hook Form** - Form management

### UI/UX Features
- **🌈 Framer Motion** - Smooth animations
- **🎯 Lucide React** - Beautiful icons
- **📊 Recharts** - Data visualization
- **🖱️ DND Kit** - Drag and drop functionality

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ancourn/Oxl.git
cd Oxl
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

4. **Set up database**
```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed database with test data
npm run db:seed
```

5. **Start development server**
```bash
npm run dev
```

6. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### Test Accounts
After running the seed script, you can use these test accounts:
- **User**: `test@example.com` / `password123`
- **Admin**: `admin@example.com` / `admin123`

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── docs/          # Document management
│   │   ├── drive/         # File management
│   │   ├── mail/          # Mail system
│   │   ├── meet/          # Video conferencing
│   │   ├── teams/         # Team management
│   │   └── notifications/ # Notification system
│   ├── auth/              # Authentication pages
│   ├── docs/              # Documents page
│   ├── drive/             # Drive page
│   ├── mail/              # Mail page
│   ├── meet/              # Meet page
│   └── teams/             # Teams page
├── components/            # React components
│   ├── auth-provider.tsx  # Authentication provider
│   ├── docs/              # Document components
│   ├── drive/             # Drive components
│   ├── layout/            # Layout components
│   ├── mail/              # Mail components
│   ├── meet/              # Meet components
│   ├── ui/                # shadcn/ui components
│   └── ...                # Other components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
│   ├── auth.ts           # Authentication utilities
│   ├── db.ts             # Database client
│   ├── socket.ts         # Socket.IO utilities
│   └── ...               # Other utilities
└── prisma/                # Database schema and migrations
    ├── schema.prisma      # Database schema
    └── seed.ts           # Database seed script
```

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npm run db:push      # Push schema to database
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:reset     # Reset database
npm run db:seed      # Seed database with test data

# Prisma Studio
npx prisma studio    # Open database viewer
```

## 🌟 Key Features Deep Dive

### 🔐 Authentication & Authorization
- **NextAuth.js Integration**: Complete authentication solution
- **Role-based Access**: Different permission levels for users
- **Team-based Security**: Isolate data between teams
- **Session Management**: Secure session handling

### 📊 Real-time Features
- **Socket.IO Integration**: Real-time updates across the application
- **Live Meeting Chat**: Real-time messaging during video calls
- **Document Collaboration**: Live document editing notifications
- **Team Activity**: Real-time team member status updates

### 🗄️ Database Design
- **Relational Structure**: Well-organized database schema
- **Team-centric Architecture**: All data organized by teams
- **Soft Deletes**: Safe data deletion with recovery options
- **Audit Trail**: Track changes and user actions

### 🎨 User Interface
- **Responsive Design**: Works seamlessly on all devices
- **Dark Mode Support**: Built-in theme switching
- **Accessibility**: WCAG-compliant components
- **Loading States**: Smooth user experience with proper loading indicators

## 🚀 Deployment

### Environment Variables for Production

```env
# Production Database
DATABASE_URL="file:./prod.db"

# NextAuth.js
NEXTAUTH_SECRET="your-production-secret"
NEXTAUTH_URL="https://your-domain.com"

# Optional: Additional services
# EMAIL_SERVER_HOST="smtp.gmail.com"
# STRIPE_SECRET_KEY="sk_test_..."
# REDIS_URL="redis://localhost:6379"
```

### Build and Deploy

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🛠️ Development Workflow

### Making Changes

1. **Feature Development**
```bash
# Start development server
npm run dev

# Make changes to components or pages
# Changes will be hot-reloaded
```

2. **Database Changes**
```bash
# Modify prisma/schema.prisma
# Push changes to database
npx prisma db push
```

3. **Testing**
```bash
# Run linting
npm run lint

# Run tests (if available)
npm test
```

### Database Management

#### View Database
```bash
# Open Prisma Studio
npx prisma studio
```

#### Reset Database
```bash
# WARNING: This will delete all data
npm run db:reset
npm run db:seed
```

## 🐛 Troubleshooting

### Common Issues

#### Port 3000 Already in Use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

#### Database Connection Errors
```bash
# Reset database connection
rm -f dev.db
npx prisma db push
npm run db:seed
```

#### Build Errors
```bash
# Clean build
rm -rf .next
npm run build
```

#### Authentication Issues
- Ensure `.env` file has correct `NEXTAUTH_SECRET`
- Verify `NEXTAUTH_URL` matches your application URL
- Check database connection and user records

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Next.js Team** for the amazing framework
- **shadcn/ui** for the beautiful components
- **Prisma** for the excellent ORM
- **Tailwind CSS** for the utility-first CSS framework

---

**Built with ❤️ for modern teams.** 🚀