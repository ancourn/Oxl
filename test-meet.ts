import { db } from './src/lib/db';

async function testMeetFunctionality() {
  console.log('🧪 Testing Meet Functionality...\n');

  try {
    // Create test user
    console.log('1. Creating test user...');
    const user = await db.user.upsert({
      where: { email: 'meet-test@example.com' },
      update: {},
      create: {
        email: 'meet-test@example.com',
        name: 'Meet Test User',
      },
    });

    // Create test team
    console.log('2. Creating test team...');
    const team = await db.team.create({
      data: {
        name: 'Meet Test Team',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
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

    console.log(`✅ Created team: ${team.name}`);

    // Test meeting creation
    console.log('\n3. Testing meeting creation...');
    const meeting = await db.meeting.create({
      data: {
        title: 'Test Meeting',
        roomId: 'test-meeting-' + Date.now(),
        teamId: team.id,
        createdBy: user.id,
        participants: {
          create: {
            userId: user.id,
          },
        },
      },
    });

    console.log(`✅ Created meeting: ${meeting.title} (Room: ${meeting.roomId})`);

    // Test meeting participant management
    console.log('\n4. Testing participant management...');
    
    // Add another participant
    const user2 = await db.user.upsert({
      where: { email: 'participant2@example.com' },
      update: {},
      create: {
        email: 'participant2@example.com',
        name: 'Participant Two',
      },
    });

    const participant = await db.meetingParticipant.create({
      data: {
        userId: user2.id,
        meetingId: meeting.id,
      },
    });

    console.log(`✅ Added participant: ${user2.name}`);

    // Test meeting chat messages
    console.log('\n5. Testing meeting chat...');
    const messages = [
      'Hello everyone!',
      'Welcome to the meeting',
      'Let\'s get started',
    ];

    for (const messageText of messages) {
      await db.meetingMessage.create({
        data: {
          meetingId: meeting.id,
          userId: user.id,
          message: messageText,
        },
      });
    }

    console.log(`✅ Added ${messages.length} chat messages`);

    // Test meeting retrieval with all data
    console.log('\n6. Testing meeting data retrieval...');
    const fullMeeting = await db.meeting.findUnique({
      where: { id: meeting.id },
      include: {
        creator: true,
        team: true,
        participants: {
          include: {
            user: true,
          },
        },
        messages: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    console.log(`✅ Retrieved meeting with ${fullMeeting?.participants.length} participants and ${fullMeeting?.messages.length} messages`);

    // Test meeting updates
    console.log('\n7. Testing meeting updates...');
    const updatedMeeting = await db.meeting.update({
      where: { id: meeting.id },
      data: {
        title: 'Updated Test Meeting',
        isActive: false,
      },
    });

    console.log(`✅ Updated meeting: ${updatedMeeting.title} (Active: ${updatedMeeting.isActive})`);

    // Test participant leaving
    console.log('\n8. Testing participant leaving...');
    const leftParticipant = await db.meetingParticipant.update({
      where: { id: participant.id },
      data: {
        leftAt: new Date(),
      },
    });

    console.log(`✅ Participant left at: ${leftParticipant.leftAt}`);

    // Test message types
    console.log('\n9. Testing different message types...');
    const systemMessage = await db.meetingMessage.create({
      data: {
        meetingId: meeting.id,
        userId: user.id,
        message: 'User joined the meeting',
        type: 'SYSTEM',
      },
    });

    console.log(`✅ Created system message: ${systemMessage.type} - ${systemMessage.message}`);

    // Verify meeting state
    console.log('\n10. Verifying meeting state...');
    const finalMeeting = await db.meeting.findUnique({
      where: { id: meeting.id },
      include: {
        participants: {
          where: {
            leftAt: null, // Only active participants
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    console.log(`✅ Final meeting state:`);
    console.log(`   Title: ${finalMeeting?.title}`);
    console.log(`   Active participants: ${finalMeeting?.participants.length}`);
    console.log(`   Total messages: ${finalMeeting?.messages.length}`);
    console.log(`   Meeting active: ${finalMeeting?.isActive}`);

    // Test room ID uniqueness
    console.log('\n11. Testing room ID uniqueness...');
    const meeting2 = await db.meeting.create({
      data: {
        title: 'Second Test Meeting',
        roomId: 'second-test-' + Date.now(),
        teamId: team.id,
        createdBy: user.id,
        participants: {
          create: {
            userId: user.id,
          },
        },
      },
    });

    console.log(`✅ Created second meeting with unique room ID: ${meeting2.roomId}`);

    // Test performance with multiple participants
    console.log('\n12. Testing performance with multiple participants...');
    const additionalUsers = [];
    for (let i = 3; i <= 10; i++) {
      const additionalUser = await db.user.upsert({
        where: { email: `user${i}@example.com` },
        update: {},
        create: {
          email: `user${i}@example.com`,
          name: `User ${i}`,
        },
      });
      additionalUsers.push(additionalUser);

      await db.meetingParticipant.create({
        data: {
          userId: additionalUser.id,
          meetingId: meeting2.id,
        },
      });
    }

    const meetingWithManyParticipants = await db.meeting.findUnique({
      where: { id: meeting2.id },
      include: {
        participants: true,
      },
    });

    console.log(`✅ Meeting with ${meetingWithManyParticipants?.participants.length} participants created successfully`);

    console.log('\n🎉 Meet functionality test completed successfully!');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await db.meetingMessage.deleteMany({
      where: {
        OR: [
          { meetingId: meeting.id },
          { meetingId: meeting2.id },
        ],
      },
    });
    await db.meetingParticipant.deleteMany({
      where: {
        OR: [
          { meetingId: meeting.id },
          { meetingId: meeting2.id },
        ],
      },
    });
    await db.meeting.deleteMany({
      where: {
        OR: [
          { id: meeting.id },
          { id: meeting2.id },
        ],
      },
    });
    await db.teamMember.deleteMany({ where: { teamId: team.id } });
    await db.subscription.deleteMany({ where: { teamId: team.id } });
    await db.team.deleteMany({ where: { id: team.id } });

    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testMeetFunctionality()
  .then(() => {
    console.log('\n✅ All Meet functionality tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Meet functionality tests failed:', error);
    process.exit(1);
  });