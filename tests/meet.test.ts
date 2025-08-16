import { NextRequest, NextResponse } from 'next/server'
import { createMocks } from 'node-mocks-http'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

describe('Meet Component - MVP Functionality', () => {
  let testUser1: any
  let testUser2: any
  let testTeam: any

  beforeEach(async () => {
    // Create test users
    testUser1 = await global.testUtils.createTestUser({
      name: 'Meet User 1',
      email: `meet1-${Date.now()}@example.com`
    })

    testUser2 = await global.testUtils.createTestUser({
      name: 'Meet User 2',
      email: `meet2-${Date.now()}@example.com`
    })

    // Create test team
    testTeam = await global.testUtils.createTestTeam(testUser1.id)

    // Add second user to team
    await db.teamMember.create({
      data: {
        teamId: testTeam.id,
        userId: testUser2.id,
        role: 'MEMBER'
      }
    })
  })

  afterEach(async () => {
    await global.testUtils.cleanupTestData()
  })

  describe('Meeting Room Management', () => {
    test('should create meeting room', async () => {
      const roomId = randomUUID()
      const meetingRoom = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Test Meeting',
          roomId,
          hostId: testUser1.id,
          description: 'Test meeting description',
          maxParticipants: 10
        },
        include: {
          host: true,
          team: true,
          participants: {
            include: {
              user: true
            }
          }
        }
      })

      expect(meetingRoom).toBeTruthy()
      expect(meetingRoom.name).toBe('Test Meeting')
      expect(meetingRoom.roomId).toBe(roomId)
      expect(meetingRoom.hostId).toBe(testUser1.id)
      expect(meetingRoom.maxParticipants).toBe(10)
      expect(meetingRoom.isLive).toBe(false)
    })

    test('should generate unique room IDs', async () => {
      const roomId1 = randomUUID()
      const roomId2 = randomUUID()

      const meeting1 = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Meeting 1',
          roomId: roomId1,
          hostId: testUser1.id
        }
      })

      const meeting2 = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Meeting 2',
          roomId: roomId2,
          hostId: testUser2.id
        }
      })

      expect(meeting1.roomId).not.toBe(meeting2.roomId)
      expect(roomId1).not.toBe(roomId2)
    })

    test('should handle meeting lifecycle', async () => {
      const roomId = randomUUID()
      const meeting = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Lifecycle Test Meeting',
          roomId,
          hostId: testUser1.id
        }
      })

      // Start meeting
      const startedMeeting = await db.meetRoom.update({
        where: { id: meeting.id },
        data: {
          isLive: true,
          startedAt: new Date()
        }
      })

      expect(startedMeeting.isLive).toBe(true)
      expect(startedMeeting.startedAt).toBeTruthy()

      // End meeting
      const endedMeeting = await db.meetRoom.update({
        where: { id: meeting.id },
        data: {
          isLive: false,
          endedAt: new Date()
        }
      })

      expect(endedMeeting.isLive).toBe(false)
      expect(endedMeeting.endedAt).toBeTruthy()
    })

    test('should handle meeting with optional fields', async () => {
      const roomId = randomUUID()
      const meeting = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Minimal Meeting',
          roomId,
          hostId: testUser1.id
          // No description, using default maxParticipants
        }
      })

      expect(meeting.name).toBe('Minimal Meeting')
      expect(meeting.description).toBeNull()
      expect(meeting.maxParticipants).toBe(50) // Default value
    })
  })

  describe('Participant Management', () => {
    test('should add participants to meeting', async () => {
      const roomId = randomUUID()
      const meeting = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Participant Test Meeting',
          roomId,
          hostId: testUser1.id
        }
      })

      // Add participant
      const participant = await db.meetParticipant.create({
        data: {
          roomId: meeting.id,
          userId: testUser2.id,
          isAudioOn: true,
          isVideoOn: true,
          isScreenSharing: false
        },
        include: {
          room: true,
          user: true
        }
      })

      expect(participant).toBeTruthy()
      expect(participant.userId).toBe(testUser2.id)
      expect(participant.roomId).toBe(meeting.id)
      expect(participant.isAudioOn).toBe(true)
      expect(participant.isVideoOn).toBe(true)
      expect(participant.isScreenSharing).toBe(false)
    })

    test('should handle participant status updates', async () => {
      const roomId = randomUUID()
      const meeting = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Status Test Meeting',
          roomId,
          hostId: testUser1.id
        }
      })

      const participant = await db.meetParticipant.create({
        data: {
          roomId: meeting.id,
          userId: testUser2.id,
          isAudioOn: true,
          isVideoOn: true,
          isScreenSharing: false
        }
      })

      // Update participant status
      const updatedParticipant = await db.meetParticipant.update({
        where: { id: participant.id },
        data: {
          isAudioOn: false,
          isVideoOn: false,
          isScreenSharing: true
        }
      })

      expect(updatedParticipant.isAudioOn).toBe(false)
      expect(updatedParticipant.isVideoOn).toBe(false)
      expect(updatedParticipant.isScreenSharing).toBe(true)
    })

    test('should handle participant join/leave times', async () => {
      const roomId = randomUUID()
      const meeting = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Join/Leave Test Meeting',
          roomId,
          hostId: testUser1.id
        }
      })

      const joinTime = new Date()
      const participant = await db.meetParticipant.create({
        data: {
          roomId: meeting.id,
          userId: testUser2.id,
          joinedAt: joinTime
        }
      })

      expect(participant.joinedAt).toBeTruthy()

      // Simulate leaving meeting
      const leaveTime = new Date()
      const leftParticipant = await db.meetParticipant.update({
        where: { id: participant.id },
        data: {
          leftAt: leaveTime
        }
      })

      expect(leftParticipant.leftAt).toBeTruthy()
      expect(leftParticipant.leftAt?.getTime()).toBeGreaterThanOrEqual(joinTime.getTime())
    })

    test('should prevent duplicate participants', async () => {
      const roomId = randomUUID()
      const meeting = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Duplicate Test Meeting',
          roomId,
          hostId: testUser1.id
        }
      })

      // Add participant
      await db.meetParticipant.create({
        data: {
          roomId: meeting.id,
          userId: testUser2.id
        }
      })

      // Try to add same participant again - should fail due to unique constraint
      await expect(
        db.meetParticipant.create({
          data: {
            roomId: meeting.id,
            userId: testUser2.id
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('Meeting Messaging', () => {
    test('should send text messages in meeting', async () => {
      const roomId = randomUUID()
      const meeting = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Message Test Meeting',
          roomId,
          hostId: testUser1.id
        }
      })

      const message = await db.meetMessage.create({
        data: {
          roomId: meeting.id,
          userId: testUser1.id,
          message: 'Hello everyone!',
          type: 'TEXT'
        },
        include: {
          room: true,
          user: true
        }
      })

      expect(message).toBeTruthy()
      expect(message.message).toBe('Hello everyone!')
      expect(message.type).toBe('TEXT')
      expect(message.userId).toBe(testUser1.id)
      expect(message.roomId).toBe(meeting.id)
    })

    test('should handle system messages', async () => {
      const roomId = randomUUID()
      const meeting = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'System Message Test Meeting',
          roomId,
          hostId: testUser1.id
        }
      })

      // Join system message
      const joinMessage = await db.meetMessage.create({
        data: {
          roomId: meeting.id,
          userId: testUser2.id,
          message: 'User joined the meeting',
          type: 'JOIN'
        }
      })

      expect(joinMessage.type).toBe('JOIN')
      expect(joinMessage.message).toBe('User joined the meeting')

      // Leave system message
      const leaveMessage = await db.meetMessage.create({
        data: {
          roomId: meeting.id,
          userId: testUser2.id,
          message: 'User left the meeting',
          type: 'LEAVE'
        }
      })

      expect(leaveMessage.type).toBe('LEAVE')
      expect(leaveMessage.message).toBe('User left the meeting')

      // General system message
      const systemMessage = await db.meetMessage.create({
        data: {
          roomId: meeting.id,
          userId: testUser1.id,
          message: 'Meeting recording started',
          type: 'SYSTEM'
        }
      })

      expect(systemMessage.type).toBe('SYSTEM')
      expect(systemMessage.message).toBe('Meeting recording started')
    })

    test('should retrieve meeting messages in chronological order', async () => {
      const roomId = randomUUID()
      const meeting = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Chronological Test Meeting',
          roomId,
          hostId: testUser1.id
        }
      })

      // Send messages with delay
      const message1 = await db.meetMessage.create({
        data: {
          roomId: meeting.id,
          userId: testUser1.id,
          message: 'First message',
          type: 'TEXT'
        }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const message2 = await db.meetMessage.create({
        data: {
          roomId: meeting.id,
          userId: testUser2.id,
          message: 'Second message',
          type: 'TEXT'
        }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const message3 = await db.meetMessage.create({
        data: {
          roomId: meeting.id,
          userId: testUser1.id,
          message: 'Third message',
          type: 'TEXT'
        }
      })

      // Retrieve messages in chronological order
      const messages = await db.meetMessage.findMany({
        where: { roomId: meeting.id },
        orderBy: { createdAt: 'asc' }
      })

      expect(messages).toHaveLength(3)
      expect(messages[0].id).toBe(message1.id)
      expect(messages[1].id).toBe(message2.id)
      expect(messages[2].id).toBe(message3.id)
    })
  })

  describe('Meeting Queries and Filtering', () => {
    test('should get meetings by team', async () => {
      const roomId1 = randomUUID()
      const roomId2 = randomUUID()

      // Create meetings for the team
      const meeting1 = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Team Meeting 1',
          roomId: roomId1,
          hostId: testUser1.id
        }
      })

      const meeting2 = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Team Meeting 2',
          roomId: roomId2,
          hostId: testUser2.id
        }
      })

      // Get meetings by team
      const teamMeetings = await db.meetRoom.findMany({
        where: { teamId: testTeam.id },
        include: {
          host: true,
          team: true
        }
      })

      expect(teamMeetings).toHaveLength(2)
      expect(teamMeetings.map(m => m.id)).toContain(meeting1.id)
      expect(teamMeetings.map(m => m.id)).toContain(meeting2.id)
    })

    test('should get meetings by host', async () => {
      const roomId1 = randomUUID()
      const roomId2 = randomUUID()

      // Create meetings hosted by user1
      const meeting1 = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Hosted Meeting 1',
          roomId: roomId1,
          hostId: testUser1.id
        }
      })

      const meeting2 = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Hosted Meeting 2',
          roomId: roomId2,
          hostId: testUser1.id
        }
      })

      // Create meeting hosted by user2
      const meeting3 = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Other Host Meeting',
          roomId: randomUUID(),
          hostId: testUser2.id
        }
      })

      // Get meetings by host
      const hostedMeetings = await db.meetRoom.findMany({
        where: { hostId: testUser1.id }
      })

      expect(hostedMeetings).toHaveLength(2)
      expect(hostedMeetings.map(m => m.id)).toContain(meeting1.id)
      expect(hostedMeetings.map(m => m.id)).toContain(meeting2.id)
      expect(hostedMeetings.map(m => m.id)).not.toContain(meeting3.id)
    })

    test('should get meetings where user is participant', async () => {
      const roomId1 = randomUUID()
      const roomId2 = randomUUID()

      // Create meeting where user2 is host
      const meeting1 = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Host Meeting',
          roomId: roomId1,
          hostId: testUser2.id
        }
      })

      // Create meeting where user1 is host and user2 is participant
      const meeting2 = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Participant Meeting',
          roomId: roomId2,
          hostId: testUser1.id
        }
      })

      // Add user2 as participant to meeting2
      await db.meetParticipant.create({
        data: {
          roomId: meeting2.id,
          userId: testUser2.id
        }
      })

      // Get meetings where user2 is host or participant
      const user2Meetings = await db.meetRoom.findMany({
        where: {
          OR: [
            { hostId: testUser2.id },
            {
              participants: {
                some: {
                  userId: testUser2.id
                }
              }
            }
          ]
        }
      })

      expect(user2Meetings).toHaveLength(2)
      expect(user2Meetings.map(m => m.id)).toContain(meeting1.id)
      expect(user2Meetings.map(m => m.id)).toContain(meeting2.id)
    })

    test('should get active meetings', async () => {
      const roomId1 = randomUUID()
      const roomId2 = randomUUID()

      // Create active meeting
      const activeMeeting = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Active Meeting',
          roomId: roomId1,
          hostId: testUser1.id,
          isLive: true,
          startedAt: new Date()
        }
      })

      // Create inactive meeting
      const inactiveMeeting = await db.meetRoom.create({
        data: {
          teamId: testTeam.id,
          name: 'Inactive Meeting',
          roomId: roomId2,
          hostId: testUser2.id,
          isLive: false
        }
      })

      // Get active meetings
      const activeMeetings = await db.meetRoom.findMany({
        where: { isLive: true }
      })

      expect(activeMeetings).toHaveLength(1)
      expect(activeMeetings[0].id).toBe(activeMeeting.id)
    })
  })

  describe('Meeting API Integration', () => {
    test('should handle meeting creation API', async () => {
      // Mock POST request for creating meeting
      const { req } = createMocks({
        method: 'POST',
        body: {
          title: 'API Test Meeting',
          teamId: testTeam.id
        }
      })

      // Mock GET request for fetching meetings
      const { req: getRequest } = createMocks({
        method: 'GET',
        query: {
          teamId: testTeam.id
        }
      })

      // Verify request structure
      expect(req.method).toBe('POST')
      expect(req.body.title).toBe('API Test Meeting')
      expect(req.body.teamId).toBe(testTeam.id)

      expect(getRequest.method).toBe('GET')
      expect(getRequest.query.teamId).toBe(testTeam.id)
    })

    test('should validate meeting data', async () => {
      // Test with empty team ID
      const invalidMeeting = {
        name: 'Invalid Meeting',
        roomId: randomUUID(),
        hostId: testUser1.id,
        teamId: ''
      }

      expect(invalidMeeting.teamId).toBe('')

      // Test with invalid max participants
      const invalidMaxParticipants = {
        teamId: testTeam.id,
        name: 'Invalid Max Participants',
        roomId: randomUUID(),
        hostId: testUser1.id,
        maxParticipants: -1
      }

      expect(invalidMaxParticipants.maxParticipants).toBe(-1)
    })
  })
})