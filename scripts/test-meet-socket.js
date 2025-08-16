const { io } = require('socket.io-client')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

class MeetWebSocketTester {
  constructor() {
    this.clients = new Map()
    this.testResults = []
    this.connectedClients = 0
    this.meetingRoom = null
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`)
    this.testResults.push({ timestamp, message, type })
  }

  async setupTestData() {
    this.log('Setting up test data...')

    // Create test users
    this.user1 = await prisma.user.create({
      data: {
        email: `meet-user1-${Date.now()}@example.com`,
        name: 'Meet User 1',
        password: 'testpassword123',
        plan: 'PRO',
        emailVerified: true,
      }
    })

    this.user2 = await prisma.user.create({
      data: {
        email: `meet-user2-${Date.now()}@example.com`,
        name: 'Meet User 2',
        password: 'testpassword123',
        plan: 'PRO',
        emailVerified: true,
      }
    })

    // Create test team
    this.team = await prisma.team.create({
      data: {
        name: 'Meet Test Team',
        description: 'Team for meeting testing',
        ownerId: this.user1.id,
      }
    })

    // Add users to team
    await prisma.teamMember.create({
      data: {
        teamId: this.team.id,
        userId: this.user1.id,
        role: 'OWNER',
      }
    })

    await prisma.teamMember.create({
      data: {
        teamId: this.team.id,
        userId: this.user2.id,
        role: 'MEMBER',
      }
    })

    // Create meeting room
    this.meetingRoom = await prisma.meetRoom.create({
      data: {
        teamId: this.team.id,
        name: 'Test Meeting Room',
        roomId: `room-${Date.now()}`,
        hostId: this.user1.id,
        maxParticipants: 10,
      }
    })

    this.log('Test data setup completed', 'success')
  }

  async connectClients() {
    this.log('Connecting Meet WebSocket clients...')

    const serverUrl = 'http://localhost:3000'

    // Connect host client
    this.hostClient = io(serverUrl, {
      auth: {
        userId: this.user1.id,
        teamId: this.team.id,
        meetingId: this.meetingRoom.id,
        role: 'host'
      }
    })

    // Connect participant client
    this.participantClient = io(serverUrl, {
      auth: {
        userId: this.user2.id,
        teamId: this.team.id,
        meetingId: this.meetingRoom.id,
        role: 'participant'
      }
    })

    // Setup event handlers for host
    this.hostClient.on('connect', () => {
      this.log(`Host connected: ${this.hostClient.id}`, 'success')
      this.connectedClients++
      this.checkAllClientsConnected()
    })

    this.hostClient.on('disconnect', () => {
      this.log(`Host disconnected: ${this.hostClient.id}`, 'warning')
      this.connectedClients--
    })

    this.hostClient.on('error', (error) => {
      this.log(`Host error: ${error.message}`, 'error')
    })

    // Setup event handlers for participant
    this.participantClient.on('connect', () => {
      this.log(`Participant connected: ${this.participantClient.id}`, 'success')
      this.connectedClients++
      this.checkAllClientsConnected()
    })

    this.participantClient.on('disconnect', () => {
      this.log(`Participant disconnected: ${this.participantClient.id}`, 'warning')
      this.connectedClients--
    })

    this.participantClient.on('error', (error) => {
      this.log(`Participant error: ${error.message}`, 'error')
    })

    // Wait for connections
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  checkAllClientsConnected() {
    if (this.connectedClients === 2) {
      this.log('All clients connected successfully', 'success')
      this.runTests()
    }
  }

  async runTests() {
    try {
      await this.testMeetingJoin()
      await this.testChatMessaging()
      await this.testAudioVideoControls()
      await this.testParticipantManagement()
      await this.testMeetingLifecycle()
      
      this.log('All Meet WebSocket tests completed successfully', 'success')
      this.generateReport()
    } catch (error) {
      this.log(`Test failed: ${error.message}`, 'error')
      this.generateReport()
    }
  }

  async testMeetingJoin() {
    this.log('Testing meeting join...', 'info')

    return new Promise((resolve, reject) => {
      let joinEvents = 0
      const expectedJoins = 2

      // Listen for join events
      this.hostClient.on('participant:joined', (data) => {
        this.log(`Host received participant join: ${data.userId}`, 'info')
        joinEvents++
        if (joinEvents >= expectedJoins) {
          this.log('Meeting join test passed', 'success')
          resolve()
        }
      })

      this.participantClient.on('participant:joined', (data) => {
        this.log(`Participant received join event: ${data.userId}`, 'info')
        joinEvents++
        if (joinEvents >= expectedJoins) {
          this.log('Meeting join test passed', 'success')
          resolve()
        }
      })

      // Simulate joining meeting
      setTimeout(() => {
        this.hostClient.emit('meeting:join', {
          meetingId: this.meetingRoom.id,
          userId: this.user1.id,
          role: 'host'
        })
      }, 1000)

      setTimeout(() => {
        this.participantClient.emit('meeting:join', {
          meetingId: this.meetingRoom.id,
          userId: this.user2.id,
          role: 'participant'
        })
      }, 1500)

      // Timeout if no joins received
      setTimeout(() => {
        if (joinEvents < expectedJoins) {
          reject(new Error('Meeting join test timed out'))
        }
      }, 5000)
    })
  }

  async testChatMessaging() {
    this.log('Testing chat messaging...', 'info')

    return new Promise((resolve, reject) => {
      let messagesReceived = 0
      const expectedMessages = 4 // 2 sent, 2 received each

      // Listen for chat messages
      this.hostClient.on('chat:message', (data) => {
        this.log(`Host received message: ${data.message}`, 'info')
        messagesReceived++
        if (messagesReceived >= expectedMessages) {
          this.log('Chat messaging test passed', 'success')
          resolve()
        }
      })

      this.participantClient.on('chat:message', (data) => {
        this.log(`Participant received message: ${data.message}`, 'info')
        messagesReceived++
        if (messagesReceived >= expectedMessages) {
          this.log('Chat messaging test passed', 'success')
          resolve()
        }
      })

      // Simulate sending messages
      setTimeout(() => {
        this.hostClient.emit('chat:send', {
          meetingId: this.meetingRoom.id,
          message: 'Hello from host!',
          userId: this.user1.id
        })
      }, 1000)

      setTimeout(() => {
        this.participantClient.emit('chat:send', {
          meetingId: this.meetingRoom.id,
          message: 'Hello from participant!',
          userId: this.user2.id
        })
      }, 1500)

      // Timeout if no messages received
      setTimeout(() => {
        if (messagesReceived < expectedMessages) {
          reject(new Error('Chat messaging test timed out'))
        }
      }, 5000)
    })
  }

  async testAudioVideoControls() {
    this.log('Testing audio/video controls...', 'info')

    return new Promise((resolve, reject) => {
      let controlEvents = 0
      const expectedControls = 6 // 3 controls × 2 clients receiving

      // Listen for control events
      this.hostClient.on('participant:controls', (data) => {
        this.log(`Host received controls update: ${JSON.stringify(data)}`, 'info')
        controlEvents++
        if (controlEvents >= expectedControls) {
          this.log('Audio/video controls test passed', 'success')
          resolve()
        }
      })

      this.participantClient.on('participant:controls', (data) => {
        this.log(`Participant received controls update: ${JSON.stringify(data)}`, 'info')
        controlEvents++
        if (controlEvents >= expectedControls) {
          this.log('Audio/video controls test passed', 'success')
          resolve()
        }
      })

      // Simulate control changes
      setTimeout(() => {
        this.hostClient.emit('participant:controls', {
          meetingId: this.meetingRoom.id,
          userId: this.user1.id,
          audio: false,
          video: true,
          screen: false
        })
      }, 1000)

      setTimeout(() => {
        this.participantClient.emit('participant:controls', {
          meetingId: this.meetingRoom.id,
          userId: this.user2.id,
          audio: true,
          video: false,
          screen: false
        })
      }, 1500)

      setTimeout(() => {
        this.hostClient.emit('participant:controls', {
          meetingId: this.meetingRoom.id,
          userId: this.user1.id,
          audio: true,
          video: true,
          screen: true
        })
      }, 2000)

      // Timeout if no control events received
      setTimeout(() => {
        if (controlEvents < expectedControls) {
          reject(new Error('Audio/video controls test timed out'))
        }
      }, 5000)
    })
  }

  async testParticipantManagement() {
    this.log('Testing participant management...', 'info')

    return new Promise((resolve, reject) => {
      let managementEvents = 0
      const expectedEvents = 2

      // Listen for management events
      this.hostClient.on('participant:management', (data) => {
        this.log(`Host received management event: ${data.action}`, 'info')
        managementEvents++
        if (managementEvents >= expectedEvents) {
          this.log('Participant management test passed', 'success')
          resolve()
        }
      })

      this.participantClient.on('participant:management', (data) => {
        this.log(`Participant received management event: ${data.action}`, 'info')
        managementEvents++
        if (managementEvents >= expectedEvents) {
          this.log('Participant management test passed', 'success')
          resolve()
        }
      })

      // Simulate management actions
      setTimeout(() => {
        this.hostClient.emit('participant:kick', {
          meetingId: this.meetingRoom.id,
          targetUserId: this.user2.id,
          reason: 'Test kick'
        })
      }, 1000)

      setTimeout(() => {
        this.hostClient.emit('participant:mute', {
          meetingId: this.meetingRoom.id,
          targetUserId: this.user2.id,
          mute: true
        })
      }, 1500)

      // Timeout if no management events received
      setTimeout(() => {
        if (managementEvents < expectedEvents) {
          reject(new Error('Participant management test timed out'))
        }
      }, 5000)
    })
  }

  async testMeetingLifecycle() {
    this.log('Testing meeting lifecycle...', 'info')

    return new Promise((resolve, reject) => {
      let lifecycleEvents = 0
      const expectedEvents = 4 // start, pause, resume, end

      // Listen for lifecycle events
      this.hostClient.on('meeting:lifecycle', (data) => {
        this.log(`Host received lifecycle event: ${data.event}`, 'info')
        lifecycleEvents++
        if (lifecycleEvents >= expectedEvents) {
          this.log('Meeting lifecycle test passed', 'success')
          resolve()
        }
      })

      this.participantClient.on('meeting:lifecycle', (data) => {
        this.log(`Participant received lifecycle event: ${data.event}`, 'info')
        lifecycleEvents++
        if (lifecycleEvents >= expectedEvents) {
          this.log('Meeting lifecycle test passed', 'success')
          resolve()
        }
      })

      // Simulate lifecycle events
      setTimeout(() => {
        this.hostClient.emit('meeting:start', {
          meetingId: this.meetingRoom.id
        })
      }, 1000)

      setTimeout(() => {
        this.hostClient.emit('meeting:pause', {
          meetingId: this.meetingRoom.id
        })
      }, 1500)

      setTimeout(() => {
        this.hostClient.emit('meeting:resume', {
          meetingId: this.meetingRoom.id
        })
      }, 2000)

      setTimeout(() => {
        this.hostClient.emit('meeting:end', {
          meetingId: this.meetingRoom.id
        })
      }, 2500)

      // Timeout if no lifecycle events received
      setTimeout(() => {
        if (lifecycleEvents < expectedEvents) {
          reject(new Error('Meeting lifecycle test timed out'))
        }
      }, 5000)
    })
  }

  generateReport() {
    this.log('Generating Meet WebSocket test report...', 'info')

    const report = {
      testType: 'Meet WebSocket Real-Time Communication',
      timestamp: new Date().toISOString(),
      results: this.testResults,
      summary: {
        totalTests: 5,
        passedTests: this.testResults.filter(r => r.type === 'success').length,
        failedTests: this.testResults.filter(r => r.type === 'error').length,
        warnings: this.testResults.filter(r => r.type === 'warning').length,
      },
      meetingInfo: {
        meetingId: this.meetingRoom.id,
        hostId: this.user1.id,
        participantId: this.user2.id,
        teamId: this.team.id
      },
      recommendations: []
    }

    // Add recommendations based on results
    if (report.summary.failedTests > 0) {
      report.recommendations.push('Fix Meet WebSocket connection issues')
    }

    if (report.summary.warnings > 0) {
      report.recommendations.push('Address meeting stability warnings')
    }

    if (report.summary.passedTests === report.summary.totalTests) {
      report.recommendations.push('All Meet WebSocket tests passed - ready for production')
    }

    // Save report
    const fs = require('fs')
    const reportPath = './meet-websocket-test-report.json'
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    this.log(`Meet WebSocket test report saved to: ${reportPath}`, 'success')
    this.log(`Tests passed: ${report.summary.passedTests}/${report.summary.totalTests}`, 'info')
  }

  async cleanup() {
    this.log('Cleaning up test data...')

    try {
      // Clean up database
      await prisma.meetMessage.deleteMany({
        where: {
          room: {
            teamId: this.team.id
          }
        }
      })

      await prisma.meetParticipant.deleteMany({
        where: {
          room: {
            teamId: this.team.id
          }
        }
      })

      await prisma.meetRoom.deleteMany({
        where: {
          teamId: this.team.id
        }
      })

      await prisma.teamMember.deleteMany({
        where: {
          teamId: this.team.id
        }
      })

      await prisma.team.delete({
        where: {
          id: this.team.id
        }
      })

      await prisma.user.deleteMany({
        where: {
          id: {
            in: [this.user1.id, this.user2.id]
          }
        }
      })

      // Disconnect clients
      if (this.hostClient) {
        this.hostClient.disconnect()
      }

      if (this.participantClient) {
        this.participantClient.disconnect()
      }

      this.log('Cleanup completed', 'success')
    } catch (error) {
      this.log(`Cleanup error: ${error.message}`, 'error')
    }
  }

  async run() {
    try {
      await this.setupTestData()
      await this.connectClients()
      
      // Wait for tests to complete
      await new Promise(resolve => setTimeout(resolve, 20000))
      
      await this.cleanup()
    } catch (error) {
      this.log(`Test execution failed: ${error.message}`, 'error')
      await this.cleanup()
    } finally {
      await prisma.$disconnect()
    }
  }
}

// Run the tests
const tester = new MeetWebSocketTester()
tester.run()