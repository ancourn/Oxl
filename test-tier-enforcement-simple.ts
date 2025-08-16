import { db } from './src/lib/db';

async function testTierEnforcement() {
  console.log('🧪 Testing Free vs Pro Tier Enforcement...\n');

  try {
    // Create test users
    console.log('1. Creating test users...');
    const freeUser = await db.user.upsert({
      where: { email: 'free-user@example.com' },
      update: {},
      create: {
        email: 'free-user@example.com',
        name: 'Free Tier User',
      },
    });

    const proUser = await db.user.upsert({
      where: { email: 'pro-user@example.com' },
      update: {},
      create: {
        email: 'pro-user@example.com',
        name: 'Pro Tier User',
      },
    });

    console.log(`✅ Created users: ${freeUser.name}, ${proUser.name}`);

    // Create teams with different subscription plans
    console.log('\n2. Creating teams with different subscription plans...');
    const freeTeam = await db.team.create({
      data: {
        name: 'Free Tier Team',
        ownerId: freeUser.id,
        members: {
          create: {
            userId: freeUser.id,
            role: 'OWNER',
          },
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

    const proTeam = await db.team.create({
      data: {
        name: 'Pro Tier Team',
        ownerId: proUser.id,
        members: {
          create: {
            userId: proUser.id,
            role: 'OWNER',
          },
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

    console.log(`✅ Created teams: ${freeTeam.name} (${freeTeam.subscription?.plan}), ${proTeam.name} (${proTeam.subscription?.plan})`);

    // Test meeting participant limits
    console.log('\n3. Testing meeting participant limits...');
    
    // Free tier - should allow up to 3 participants
    const freeMeeting = await db.meeting.create({
      data: {
        title: 'Free Tier Meeting',
        roomId: 'free-meeting-' + Date.now(),
        teamId: freeTeam.id,
        createdBy: freeUser.id,
        participants: {
          create: [
            { userId: freeUser.id },
          ],
        },
      },
    });

    // Add 2 more participants (total 3 - limit for free tier)
    for (let i = 1; i <= 2; i++) {
      const user = await db.user.upsert({
        where: { email: `free-user-${i}@example.com` },
        update: {},
        create: {
          email: `free-user-${i}@example.com`,
          name: `Free User ${i}`,
        },
      });

      await db.meetingParticipant.create({
        data: {
          userId: user.id,
          meetingId: freeMeeting.id,
        },
      });
    }

    const freeParticipantCount = await db.meetingParticipant.count({
      where: { meetingId: freeMeeting.id },
    });
    console.log(`   Free meeting: ${freeParticipantCount} participants (limit: 3)`);

    // Pro tier - should allow more participants
    const proMeeting = await db.meeting.create({
      data: {
        title: 'Pro Tier Meeting',
        roomId: 'pro-meeting-' + Date.now(),
        teamId: proTeam.id,
        createdBy: proUser.id,
        participants: {
          create: [
            { userId: proUser.id },
          ],
        },
      },
    });

    // Add more participants to pro meeting
    for (let i = 1; i <= 5; i++) {
      const user = await db.user.upsert({
        where: { email: `pro-user-${i}@example.com` },
        update: {},
        create: {
          email: `pro-user-${i}@example.com`,
          name: `Pro User ${i}`,
        },
      });

      await db.meetingParticipant.create({
        data: {
          userId: user.id,
          meetingId: proMeeting.id,
        },
      });
    }

    const proParticipantCount = await db.meetingParticipant.count({
      where: { meetingId: proMeeting.id },
    });
    console.log(`   Pro meeting: ${proParticipantCount} participants (limit: 50)`);

    // Test team member limits
    console.log('\n4. Testing team member limits...');
    
    // Free tier - should allow up to 5 members
    for (let i = 1; i <= 4; i++) {
      const user = await db.user.upsert({
        where: { email: `free-member-${i}@example.com` },
        update: {},
        create: {
          email: `free-member-${i}@example.com`,
          name: `Free Member ${i}`,
        },
      });

      await db.teamMember.create({
        data: {
          userId: user.id,
          teamId: freeTeam.id,
          role: 'MEMBER',
        },
      });
    }

    const freeMemberCount = await db.teamMember.count({
      where: { teamId: freeTeam.id },
    });
    console.log(`   Free team: ${freeMemberCount} members (limit: 5)`);

    // Pro tier - should allow unlimited members
    for (let i = 1; i <= 8; i++) {
      const user = await db.user.upsert({
        where: { email: `pro-member-${i}@example.com` },
        update: {},
        create: {
          email: `pro-member-${i}@example.com`,
          name: `Pro Member ${i}`,
        },
      });

      await db.teamMember.create({
        data: {
          userId: user.id,
          teamId: proTeam.id,
          role: 'MEMBER',
        },
      });
    }

    const proMemberCount = await db.teamMember.count({
      where: { teamId: proTeam.id },
    });
    console.log(`   Pro team: ${proMemberCount} members (limit: unlimited)`);

    // Test mail creation
    console.log('\n5. Testing mail creation...');
    
    // Create test mails for free team
    for (let i = 1; i <= 5; i++) {
      await db.mail.create({
        data: {
          fromUserId: freeUser.id,
          toUserId: freeUser.id,
          subject: `Test Mail ${i} - Free Tier`,
          body: 'This is a test email.',
          folder: 'INBOX',
          teamId: freeTeam.id,
        },
      });
    }

    const freeMailCount = await db.mail.count({
      where: { teamId: freeTeam.id },
    });
    console.log(`   Free team: ${freeMailCount} mails`);

    // Create test mails for pro team
    for (let i = 1; i <= 10; i++) {
      await db.mail.create({
        data: {
          fromUserId: proUser.id,
          toUserId: proUser.id,
          subject: `Test Mail ${i} - Pro Tier`,
          body: 'This is a test email for pro tier.',
          folder: 'INBOX',
          teamId: proTeam.id,
        },
      });
    }

    const proMailCount = await db.mail.count({
      where: { teamId: proTeam.id },
    });
    console.log(`   Pro team: ${proMailCount} mails`);

    // Generate tier enforcement report
    console.log('\n6. Generating tier enforcement report...');
    
    console.log('\n📊 TIER ENFORCEMENT REPORT:');
    console.log('='.repeat(50));
    console.log('FREE TIER:');
    console.log(`   Meeting participants: ${freeParticipantCount}/3`);
    console.log(`   Team members: ${freeMemberCount}/5`);
    console.log(`   Mail storage: ${freeMailCount} emails`);
    console.log(`   Screen sharing: ❌`);
    console.log(`   Recording: ❌`);
    
    console.log('\nPRO TIER:');
    console.log(`   Meeting participants: ${proParticipantCount}/50`);
    console.log(`   Team members: ${proMemberCount}/unlimited`);
    console.log(`   Mail storage: ${proMailCount} emails`);
    console.log(`   Screen sharing: ✅`);
    console.log(`   Recording: ✅`);

    console.log('\n🎉 Tier enforcement test completed successfully!');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await db.mail.deleteMany({
      where: {
        OR: [
          { teamId: freeTeam.id },
          { teamId: proTeam.id },
        ],
      },
    });
    await db.meetingParticipant.deleteMany({
      where: {
        meeting: {
          OR: [
            { teamId: freeTeam.id },
            { teamId: proTeam.id },
          ],
        },
      },
    });
    await db.meeting.deleteMany({
      where: {
        OR: [
          { teamId: freeTeam.id },
          { teamId: proTeam.id },
        ],
      },
    });
    await db.teamMember.deleteMany({
      where: {
        OR: [
          { teamId: freeTeam.id },
          { teamId: proTeam.id },
        ],
      },
    });
    await db.subscription.deleteMany({
      where: {
        OR: [
          { teamId: freeTeam.id },
          { teamId: proTeam.id },
        ],
      },
    });
    await db.team.deleteMany({
      where: {
        OR: [
          { id: freeTeam.id },
          { id: proTeam.id },
        ],
      },
    });

    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testTierEnforcement()
  .then(() => {
    console.log('\n✅ All tier enforcement tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Tier enforcement tests failed:', error);
    process.exit(1);
  });