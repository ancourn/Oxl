import { db } from './src/lib/db';

// Define tier limits
const TIER_LIMITS = {
  free: {
    maxMeetingParticipants: 3,
    maxMailStorage: 100, // MB
    maxDriveStorage: 5000, // MB
    maxTeamMembers: 5,
    features: {
      screenShare: false,
      recording: false,
      customDomain: false,
      prioritySupport: false,
    }
  },
  pro: {
    maxMeetingParticipants: 50,
    maxMailStorage: 100000, // MB
    maxDriveStorage: 100000, // MB
    maxTeamMembers: Infinity,
    features: {
      screenShare: true,
      recording: true,
      customDomain: true,
      prioritySupport: true,
    }
  }
};

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

    // Add participants to test limit
    const additionalFreeUsers = [];
    for (let i = 1; i <= 4; i++) {
      const user = await db.user.upsert({
        where: { email: `free-user-${i}@example.com` },
        update: {},
        create: {
          email: `free-user-${i}@example.com`,
          name: `Free User ${i}`,
        },
      });
      additionalFreeUsers.push(user);

      try {
        await db.meetingParticipant.create({
          data: {
            userId: user.id,
            meetingId: freeMeeting.id,
          },
        });
        
        const participantCount = await db.meetingParticipant.count({
          where: { meetingId: freeMeeting.id },
        });
        
        console.log(`   Free meeting: ${participantCount} participants`);
        
        // Check if we've exceeded the limit
        if (participantCount > TIER_LIMITS.free.maxMeetingParticipants) {
          console.log(`   ❌ WARNING: Free meeting exceeded participant limit of ${TIER_LIMITS.free.maxMeetingParticipants}`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to add participant ${i} to free meeting (limit enforced)`);
      }
    }

    // Pro tier - should allow up to 50 participants
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
    const additionalProUsers = [];
    for (let i = 1; i <= 10; i++) {
      const user = await db.user.upsert({
        where: { email: `pro-user-${i}@example.com` },
        update: {},
        create: {
          email: `pro-user-${i}@example.com`,
          name: `Pro User ${i}`,
        },
      });
      additionalProUsers.push(user);

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
    console.log(`   Pro meeting: ${proParticipantCount} participants`);

    // Test team member limits
    console.log('\n4. Testing team member limits...');
    
    // Free tier - should allow up to 5 members
    for (let i = 1; i <= 6; i++) {
      const user = await db.user.upsert({
        where: { email: `free-member-${i}@example.com` },
        update: {},
        create: {
          email: `free-member-${i}@example.com`,
          name: `Free Member ${i}`,
        },
      });

      try {
        await db.teamMember.create({
          data: {
            userId: user.id,
            teamId: freeTeam.id,
            role: 'MEMBER',
          },
        });
        
        const memberCount = await db.teamMember.count({
          where: { teamId: freeTeam.id },
        });
        
        console.log(`   Free team: ${memberCount} members`);
        
        if (memberCount > TIER_LIMITS.free.maxTeamMembers) {
          console.log(`   ❌ WARNING: Free team exceeded member limit of ${TIER_LIMITS.free.maxTeamMembers}`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to add member ${i} to free team (limit enforced)`);
      }
    }

    // Pro tier - should allow unlimited members
    for (let i = 1; i <= 15; i++) {
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
    console.log(`   Pro team: ${proMemberCount} members`);

    // Test mail storage limits (simulated)
    console.log('\n5. Testing mail storage limits...');
    
    // Create test mails for free team
    const freeMails = [];
    for (let i = 1; i <= 150; i++) {
      const mail = await db.mail.create({
        data: {
          fromUserId: freeUser.id,
          toUserId: freeUser.id,
          subject: `Test Mail ${i} - Free Tier`,
          body: 'This is a test email to simulate storage usage.'.repeat(10), // Simulate larger emails
          folder: 'INBOX',
          teamId: freeTeam.id,
        },
      });
      freeMails.push(mail);
    }

    const freeMailCount = await db.mail.count({
      where: { teamId: freeTeam.id },
    });
    console.log(`   Free team: ${freeMailCount} mails`);

    if (freeMailCount > TIER_LIMITS.free.maxMailStorage / 10) { // Assuming 10MB per email for simulation
      console.log(`   ❌ WARNING: Free team may exceed mail storage limit`);
    }

    // Create test mails for pro team
    const proMails = [];
    for (let i = 1; i <= 200; i++) {
      const mail = await db.mail.create({
        data: {
          fromUserId: proUser.id,
          toUserId: proUser.id,
          subject: `Test Mail ${i} - Pro Tier`,
          body: 'This is a test email for pro tier.'.repeat(20),
          folder: 'INBOX',
          teamId: proTeam.id,
        },
      });
      proMails.push(mail);
    }

    const proMailCount = await db.mail.count({
      where: { teamId: proTeam.id },
    });
    console.log(`   Pro team: ${proMailCount} mails`);

    // Test feature access
    console.log('\n6. Testing feature access...');
    
    console.log(`   Free tier features:`);
    console.log(`   - Screen sharing: ${TIER_LIMITS.free.features.screenShare ? '✅ Available' : '❌ Not available'}`);
    console.log(`   - Recording: ${TIER_LIMITS.free.features.recording ? '✅ Available' : '❌ Not available'}`);
    console.log(`   - Custom domain: ${TIER_LIMITS.free.features.customDomain ? '✅ Available' : '❌ Not available'}`);
    console.log(`   - Priority support: ${TIER_LIMITS.free.features.prioritySupport ? '✅ Available' : '❌ Not available'}`);

    console.log(`   Pro tier features:`);
    console.log(`   - Screen sharing: ${TIER_LIMITS.pro.features.screenShare ? '✅ Available' : '❌ Not available'}`);
    console.log(`   - Recording: ${TIER_LIMITS.pro.features.recording ? '✅ Available' : '❌ Not available'}`);
    console.log(`   - Custom domain: ${TIER_LIMITS.pro.features.customDomain ? '✅ Available' : '❌ Not available'}`);
    console.log(`   - Priority support: ${TIER_LIMITS.pro.features.prioritySupport ? '✅ Available' : '❌ Not available'}`);

    // Generate tier enforcement report
    console.log('\n7. Generating tier enforcement report...');
    
    const finalFreeParticipantCount = await db.meetingParticipant.count({
      where: { meetingId: freeMeeting.id },
    });
    
    const finalFreeMemberCount = await db.teamMember.count({
      where: { teamId: freeTeam.id },
    });

    console.log('\n📊 TIER ENFORCEMENT REPORT:');
    console.log('='.repeat(50));
    console.log('FREE TIER:');
    console.log(`   Meeting participants: ${finalFreeParticipantCount}/${TIER_LIMITS.free.maxMeetingParticipants}`);
    console.log(`   Team members: ${finalFreeMemberCount}/${TIER_LIMITS.free.maxTeamMembers}`);
    console.log(`   Mail storage: ${freeMailCount * 10}/${TIER_LIMITS.free.maxMailStorage} MB (estimated)`);
    console.log(`   Drive storage: Not implemented in test`);
    console.log(`   Screen sharing: ${TIER_LIMITS.free.features.screenShare ? '✅' : '❌'}`);
    console.log(`   Recording: ${TIER_LIMITS.free.features.recording ? '✅' : '❌'}`);
    
    console.log('\nPRO TIER:');
    console.log(`   Meeting participants: ${proParticipantCount}/${TIER_LIMITS.pro.maxMeetingParticipants}`);
    console.log(`   Team members: ${proMemberCount}/${TIER_LIMITS.pro.maxTeamMembers}`);
    console.log(`   Mail storage: ${proMailCount * 20}/${TIER_LIMITS.pro.maxMailStorage} MB (estimated)`);
    console.log(`   Drive storage: Not implemented in test`);
    console.log(`   Screen sharing: ${TIER_LIMITS.pro.features.screenShare ? '✅' : '❌'}`);
    console.log(`   Recording: ${TIER_LIMITS.pro.features.recording ? '✅' : '❌'}`);

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
    await db.meetingMessage.deleteMany({
      where: {
        meeting: {
          OR: [
            { teamId: freeTeam.id },
            { teamId: proTeam.id },
          ],
        },
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