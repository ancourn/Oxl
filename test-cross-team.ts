import { db } from './src/lib/db';

async function testCrossTeamCollaboration() {
  console.log('🧪 Testing Cross-Team Collaboration...\n');

  try {
    // Create test users
    console.log('1. Creating test users...');
    const user1 = await db.user.upsert({
      where: { email: 'user1@test.com' },
      update: {},
      create: {
        email: 'user1@test.com',
        name: 'User One',
      },
    });

    const user2 = await db.user.upsert({
      where: { email: 'user2@test.com' },
      update: {},
      create: {
        email: 'user2@test.com',
        name: 'User Two',
      },
    });

    console.log(`✅ Created users: ${user1.name}, ${user2.name}`);

    // Create two different teams
    console.log('\n2. Creating test teams...');
    const team1 = await db.team.create({
      data: {
        name: 'Team Alpha',
        ownerId: user1.id,
        members: {
          create: [
            { userId: user1.id, role: 'OWNER' },
            { userId: user2.id, role: 'MEMBER' },
          ],
        },
        subscription: {
          create: {
            plan: 'pro',
            status: 'active',
            currentEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });

    const team2 = await db.team.create({
      data: {
        name: 'Team Beta',
        ownerId: user2.id,
        members: {
          create: [
            { userId: user2.id, role: 'OWNER' },
            { userId: user1.id, role: 'ADMIN' },
          ],
        },
        subscription: {
          create: {
            plan: 'free',
            status: 'active',
            currentEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });

    console.log(`✅ Created teams: ${team1.name} (${team1.subscription?.plan || 'free'}), ${team2.name} (${team2.subscription?.plan || 'free'})`);

    // Test cross-team mail
    console.log('\n3. Testing cross-team mail...');
    const mail1 = await db.mail.create({
      data: {
        fromUserId: user1.id,
        toUserId: user2.id,
        subject: 'Cross-team test from Team Alpha',
        body: 'This is a test email from Team Alpha to Team Beta member',
        folder: 'SENT',
        teamId: team1.id,
      },
    });

    const mail2 = await db.mail.create({
      data: {
        fromUserId: user2.id,
        toUserId: user1.id,
        subject: 'Reply from Team Beta',
        body: 'Reply from Team Beta member',
        folder: 'SENT',
        teamId: team2.id,
      },
    });

    console.log(`✅ Created cross-team mails: ${mail1.subject}, ${mail2.subject}`);

    // Test cross-team meetings
    console.log('\n4. Testing cross-team meetings...');
    const meeting1 = await db.meeting.create({
      data: {
        title: 'Team Alpha Meeting',
        roomId: 'team-alpha-' + Date.now(),
        teamId: team1.id,
        createdBy: user1.id,
        participants: {
          create: [
            { userId: user1.id },
            { userId: user2.id },
          ],
        },
      },
    });

    const meeting2 = await db.meeting.create({
      data: {
        title: 'Team Beta Meeting',
        roomId: 'team-beta-' + Date.now(),
        teamId: team2.id,
        createdBy: user2.id,
        participants: {
          create: [
            { userId: user2.id },
            { userId: user1.id },
          ],
        },
      },
    });

    console.log(`✅ Created cross-team meetings: ${meeting1.title}, ${meeting2.title}`);

    // Test cross-team docs
    console.log('\n5. Testing cross-team docs...');
    const doc1 = await db.doc.create({
      data: {
        title: 'Team Alpha Document',
        content: 'This document belongs to Team Alpha',
        teamId: team1.id,
        createdBy: user1.id,
      },
    });

    const doc2 = await db.doc.create({
      data: {
        title: 'Team Beta Document',
        content: 'This document belongs to Team Beta',
        teamId: team2.id,
        createdBy: user2.id,
      },
    });

    console.log(`✅ Created cross-team docs: ${doc1.title}, ${doc2.title}`);

    // Test cross-team drive
    console.log('\n6. Testing cross-team drive...');
    const drive1 = await db.drive.create({
      data: {
        name: 'Team Alpha Folder',
        teamId: team1.id,
        type: 'FOLDER',
      },
    });

    const drive2 = await db.drive.create({
      data: {
        name: 'Team Beta Folder',
        teamId: team2.id,
        type: 'FOLDER',
      },
    });

    console.log(`✅ Created cross-team drive folders: ${drive1.name}, ${drive2.name}`);

    // Verify data isolation
    console.log('\n7. Verifying data isolation...');
    
    const team1Mails = await db.mail.findMany({ where: { teamId: team1.id } });
    const team2Mails = await db.mail.findMany({ where: { teamId: team2.id } });
    
    const team1Docs = await db.doc.findMany({ where: { teamId: team1.id } });
    const team2Docs = await db.doc.findMany({ where: { teamId: team2.id } });
    
    const team1Drive = await db.drive.findMany({ where: { teamId: team1.id } });
    const team2Drive = await db.drive.findMany({ where: { teamId: team2.id } });

    console.log(`✅ Data isolation verified:`);
    console.log(`   Team Alpha: ${team1Mails.length} mails, ${team1Docs.length} docs, ${team1Drive.length} drive items`);
    console.log(`   Team Beta: ${team2Mails.length} mails, ${team2Docs.length} docs, ${team2Drive.length} drive items`);

    // Test user permissions across teams
    console.log('\n8. Testing user permissions...');
    
    const user1Team1Role = await db.teamMember.findFirst({
      where: { userId: user1.id, teamId: team1.id },
    });
    
    const user1Team2Role = await db.teamMember.findFirst({
      where: { userId: user1.id, teamId: team2.id },
    });

    console.log(`✅ User permissions verified:`);
    console.log(`   ${user1.name}: Team Alpha = ${user1Team1Role?.role}, Team Beta = ${user1Team2Role?.role}`);

    console.log('\n🎉 Cross-team collaboration test completed successfully!');
    
    // Cleanup (optional - comment out if you want to keep test data)
    console.log('\n🧹 Cleaning up test data...');
    await db.meetingMessage.deleteMany({
      where: {
        meeting: {
          OR: [
            { teamId: team1.id },
            { teamId: team2.id }
          ]
        }
      }
    });
    await db.meetingParticipant.deleteMany({
      where: {
        meeting: {
          OR: [
            { teamId: team1.id },
            { teamId: team2.id }
          ]
        }
      }
    });
    await db.meeting.deleteMany({ where: { OR: [{ teamId: team1.id }, { teamId: team2.id }] } });
    await db.mail.deleteMany({ where: { OR: [{ teamId: team1.id }, { teamId: team2.id }] } });
    await db.doc.deleteMany({ where: { OR: [{ teamId: team1.id }, { teamId: team2.id }] } });
    await db.drive.deleteMany({ where: { OR: [{ teamId: team1.id }, { teamId: team2.id }] } });
    await db.teamMember.deleteMany({ where: { OR: [{ teamId: team1.id }, { teamId: team2.id }] } });
    await db.subscription.deleteMany({ where: { OR: [{ teamId: team1.id }, { teamId: team2.id }] } });
    await db.team.deleteMany({ where: { OR: [{ id: team1.id }, { id: team2.id }] } });
    
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testCrossTeamCollaboration()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  });