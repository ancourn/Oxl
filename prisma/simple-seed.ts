import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      password: await hash('password123', 12),
      emailVerified: true,
    },
  });

  // Create second test user
  const testUser2 = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: await hash('admin123', 12),
      emailVerified: true,
    },
  });

  // Create test team
  const testTeam = await prisma.team.create({
    data: {
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
  await prisma.teamMember.create({
    data: {
      userId: testUser.id,
      teamId: testTeam.id,
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  });

  await prisma.teamMember.create({
    data: {
      userId: testUser2.id,
      teamId: testTeam.id,
      role: 'ADMIN',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('📧 Test users:');
  console.log('   - test@example.com / password123');
  console.log('   - admin@example.com / admin123');
  console.log('👥 Test team: Test Team');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });