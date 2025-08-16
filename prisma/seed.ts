import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      password: await hash('password123', 12),
      emailVerified: true,
    },
  });

  // Create second test user
  const testUser2 = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: await hash('admin123', 12),
      emailVerified: true,
    },
  });

  // Create test team
  const testTeam = await prisma.team.upsert({
    where: { id: 'test-team-1' },
    update: {},
    create: {
      id: 'test-team-1',
      name: 'Test Team',
      description: 'A test team for development',
      ownerId: testUser.id,
      subscriptionTier: 'PRO',
      subscriptionStatus: 'ACTIVE',
      maxMembers: 10,
      maxStorage: 10737418240, // 10GB
    },
  });

  // Add users to team
  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: testTeam.id,
        userId: testUser.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      teamId: testTeam.id,
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: testTeam.id,
        userId: testUser2.id,
      },
    },
    update: {},
    create: {
      userId: testUser2.id,
      teamId: testTeam.id,
      role: 'ADMIN',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  });

  // Create test documents
  const testDoc1 = await prisma.document.create({
    data: {
      title: 'Welcome Document',
      content: '# Welcome to Oxl Workspace\n\nThis is a test document created during database seeding.\n\n## Features\n- Collaborative editing\n- Real-time comments\n- Version control\n\nGet started by creating your own documents!',
      authorId: testUser.id,
      teamId: testTeam.id,
    },
  });

  const testDoc2 = await prisma.document.create({
    data: {
      title: 'Project Requirements',
      content: '# Project Requirements\n\n## Overview\nThis document outlines the project requirements.\n\n## Technical Requirements\n- Next.js 15\n- TypeScript\n- Prisma ORM\n- SQLite database\n\n## Timeline\n- Phase 1: Setup and configuration\n- Phase 2: Core features\n- Phase 3: Testing and deployment',
      authorId: testUser2.id,
      teamId: testTeam.id,
    },
  });

  // Create test comments
  await prisma.documentComment.create({
    data: {
      content: 'Great start! Looking forward to seeing this project evolve.',
      authorId: testUser2.id,
      documentId: testDoc1.id,
    },
  });

  await prisma.documentComment.create({
    data: {
      content: 'Thanks! I\'ll add more details soon.',
      authorId: testUser.id,
      documentId: testDoc1.id,
    },
  });

  // Create test mail
  await prisma.mail.create({
    data: {
      from: 'external@example.com',
      to: 'test@example.com',
      subject: 'Welcome to the team!',
      body: 'Welcome to Oxl Workspace! We\'re excited to have you on board.',
      folder: 'INBOX',
      teamId: testTeam.id,
      isRead: false,
    },
  });

  await prisma.mail.create({
    data: {
      from: 'test@example.com',
      to: 'admin@example.com',
      subject: 'Project Update',
      body: 'Here\'s the latest update on our project progress.',
      folder: 'SENT',
      teamId: testTeam.id,
      isRead: true,
    },
  });

  // Create test meeting room
  const testMeeting = await prisma.meetRoom.create({
    data: {
      roomId: 'test-meeting-1',
      name: 'Team Standup',
      description: 'Daily team standup meeting',
      teamId: testTeam.id,
      hostId: testUser.id,
      status: 'ACTIVE',
    },
  });

  // Add participants to meeting
  await prisma.meetingParticipant.create({
    data: {
      meetRoomId: testMeeting.id,
      userId: testUser.id,
      role: 'HOST',
      status: 'JOINED',
      joinedAt: new Date(),
    },
  });

  await prisma.meetingParticipant.create({
    data: {
      meetRoomId: testMeeting.id,
      userId: testUser2.id,
      role: 'PARTICIPANT',
      status: 'INVITED',
    },
  });

  // Create test meeting messages
  await prisma.meetMessage.create({
    data: {
      meetRoomId: testMeeting.id,
      userId: testUser.id,
      message: 'Welcome everyone to today\'s standup!',
      type: 'TEXT',
    },
  });

  // Create test drive items
  const testFolder = await prisma.driveItem.create({
    data: {
      name: 'Project Files',
      type: 'FOLDER',
      teamId: testTeam.id,
      createdBy: testUser.id,
    },
  });

  await prisma.driveItem.create({
    data: {
      name: 'requirements.pdf',
      type: 'FILE',
      size: 1024000, // 1MB
      mimeType: 'application/pdf',
      teamId: testTeam.id,
      createdBy: testUser2.id,
      parentId: testFolder.id,
    },
  });

  await prisma.driveItem.create({
    data: {
      name: 'design-sketch.png',
      type: 'FILE',
      size: 2048000, // 2MB
      mimeType: 'image/png',
      teamId: testTeam.id,
      createdBy: testUser.id,
      parentId: testFolder.id,
    },
  });

  // Create test notifications
  await prisma.notification.create({
    data: {
      userId: testUser.id,
      type: 'DOCUMENT_COMMENT',
      title: 'New comment on document',
      message: 'Admin User commented on your document "Welcome Document"',
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: testUser2.id,
      type: 'MEETING_INVITATION',
      title: 'Meeting invitation',
      message: 'Test User invited you to "Team Standup"',
      isRead: true,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('📧 Test users:');
  console.log('   - test@example.com / password123');
  console.log('   - admin@example.com / admin123');
  console.log('👥 Test team: Test Team');
  console.log('📄 Test documents: Welcome Document, Project Requirements');
  console.log('🎥 Test meeting: Team Standup');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });