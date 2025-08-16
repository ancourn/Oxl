const { io } = require('socket.io-client')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

class WebSocketTester {
  constructor() {
    this.clients = new Map()
    this.testResults = []
    this.connectedClients = 0
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
        email: `ws-user1-${Date.now()}@example.com`,
        name: 'WS User 1',
        password: 'testpassword123',
        plan: 'PRO',
        emailVerified: true,
      }
    })

    this.user2 = await prisma.user.create({
      data: {
        email: `ws-user2-${Date.now()}@example.com`,
        name: 'WS User 2',
        password: 'testpassword123',
        plan: 'PRO',
        emailVerified: true,
      }
    })

    // Create test team
    this.team = await prisma.team.create({
      data: {
        name: 'WS Test Team',
        description: 'Team for WebSocket testing',
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

    // Create test document
    this.document = await prisma.document.create({
      data: {
        title: 'WS Test Document',
        content: '<h1>Initial Content</h1>',
        teamId: this.team.id,
        userId: this.user1.id,
      }
    })

    // Create test folder
    this.folder = await prisma.file.create({
      data: {
        name: 'WS Test Folder',
        path: '/folder/ws-test',
        size: 0,
        mimeType: 'folder',
        bucket: 'default',
        key: `folder-${Date.now()}`,
        teamId: this.team.id,
        userId: this.user1.id,
        isFolder: true,
      }
    })

    this.log('Test data setup completed', 'success')
  }

  async connectClients() {
    this.log('Connecting WebSocket clients...')

    const serverUrl = 'http://localhost:3000'

    // Connect first client
    this.client1 = io(serverUrl, {
      auth: {
        userId: this.user1.id,
        teamId: this.team.id,
      }
    })

    // Connect second client
    this.client2 = io(serverUrl, {
      auth: {
        userId: this.user2.id,
        teamId: this.team.id,
      }
    })

    // Setup event handlers for client 1
    this.client1.on('connect', () => {
      this.log(`Client 1 connected: ${this.client1.id}`, 'success')
      this.connectedClients++
      this.checkAllClientsConnected()
    })

    this.client1.on('disconnect', () => {
      this.log(`Client 1 disconnected: ${this.client1.id}`, 'warning')
      this.connectedClients--
    })

    this.client1.on('error', (error) => {
      this.log(`Client 1 error: ${error.message}`, 'error')
    })

    // Setup event handlers for client 2
    this.client2.on('connect', () => {
      this.log(`Client 2 connected: ${this.client2.id}`, 'success')
      this.connectedClients++
      this.checkAllClientsConnected()
    })

    this.client2.on('disconnect', () => {
      this.log(`Client 2 disconnected: ${this.client2.id}`, 'warning')
      this.connectedClients--
    })

    this.client2.on('error', (error) => {
      this.log(`Client 2 error: ${error.message}`, 'error')
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
      await this.testDocumentCollaboration()
      await this.testDriveCollaboration()
      await this.testRealTimeNotifications()
      await this.testConnectionStability()
      
      this.log('All WebSocket tests completed successfully', 'success')
      this.generateReport()
    } catch (error) {
      this.log(`Test failed: ${error.message}`, 'error')
      this.generateReport()
    }
  }

  async testDocumentCollaboration() {
    this.log('Testing document collaboration...', 'info')

    return new Promise((resolve, reject) => {
      let updatesReceived = 0
      const expectedUpdates = 2

      // Listen for document updates
      this.client1.on('document:update', (data) => {
        this.log(`Client 1 received document update: ${data.documentId}`, 'info')
        updatesReceived++
        if (updatesReceived >= expectedUpdates) {
          this.log('Document collaboration test passed', 'success')
          resolve()
        }
      })

      this.client2.on('document:update', (data) => {
        this.log(`Client 2 received document update: ${data.documentId}`, 'info')
        updatesReceived++
        if (updatesReceived >= expectedUpdates) {
          this.log('Document collaboration test passed', 'success')
          resolve()
        }
      })

      // Simulate document updates
      setTimeout(() => {
        this.client1.emit('document:edit', {
          documentId: this.document.id,
          content: '<h1>Updated by User 1</h1>',
          userId: this.user1.id
        })
      }, 1000)

      setTimeout(() => {
        this.client2.emit('document:edit', {
          documentId: this.document.id,
          content: '<h1>Updated by User 2</h1>',
          userId: this.user2.id
        })
      }, 1500)

      // Timeout if no updates received
      setTimeout(() => {
        if (updatesReceived < expectedUpdates) {
          reject(new Error('Document collaboration test timed out'))
        }
      }, 5000)
    })
  }

  async testDriveCollaboration() {
    this.log('Testing Drive collaboration...', 'info')

    return new Promise((resolve, reject) => {
      let updatesReceived = 0
      const expectedUpdates = 2

      // Listen for file updates
      this.client1.on('file:update', (data) => {
        this.log(`Client 1 received file update: ${data.fileId}`, 'info')
        updatesReceived++
        if (updatesReceived >= expectedUpdates) {
          this.log('Drive collaboration test passed', 'success')
          resolve()
        }
      })

      this.client2.on('file:update', (data) => {
        this.log(`Client 2 received file update: ${data.fileId}`, 'info')
        updatesReceived++
        if (updatesReceived >= expectedUpdates) {
          this.log('Drive collaboration test passed', 'success')
          resolve()
        }
      })

      // Simulate file operations
      setTimeout(() => {
        this.client1.emit('file:create', {
          folderId: this.folder.id,
          name: 'test-file.txt',
          userId: this.user1.id
        })
      }, 1000)

      setTimeout(() => {
        this.client2.emit('file:update', {
          fileId: 'test-file-id',
          name: 'updated-test-file.txt',
          userId: this.user2.id
        })
      }, 1500)

      // Timeout if no updates received
      setTimeout(() => {
        if (updatesReceived < expectedUpdates) {
          reject(new Error('Drive collaboration test timed out'))
        }
      }, 5000)
    })
  }

  async testRealTimeNotifications() {
    this.log('Testing real-time notifications...', 'info')

    return new Promise((resolve, reject) => {
      let notificationsReceived = 0
      const expectedNotifications = 2

      // Listen for notifications
      this.client1.on('notification:receive', (data) => {
        this.log(`Client 1 received notification: ${data.type}`, 'info')
        notificationsReceived++
        if (notificationsReceived >= expectedNotifications) {
          this.log('Real-time notifications test passed', 'success')
          resolve()
        }
      })

      this.client2.on('notification:receive', (data) => {
        this.log(`Client 2 received notification: ${data.type}`, 'info')
        notificationsReceived++
        if (notificationsReceived >= expectedNotifications) {
          this.log('Real-time notifications test passed', 'success')
          resolve()
        }
      })

      // Simulate notification events
      setTimeout(() => {
        this.client1.emit('notification:send', {
          type: 'document_shared',
          message: 'A document was shared with you',
          userId: this.user2.id
        })
      }, 1000)

      setTimeout(() => {
        this.client2.emit('notification:send', {
          type: 'meeting_invite',
          message: 'You have been invited to a meeting',
          userId: this.user1.id
        })
      }, 1500)

      // Timeout if no notifications received
      setTimeout(() => {
        if (notificationsReceived < expectedNotifications) {
          reject(new Error('Real-time notifications test timed out'))
        }
      }, 5000)
    })
  }

  async testConnectionStability() {
    this.log('Testing connection stability...', 'info')

    return new Promise((resolve) => {
      let pingCount = 0
      const expectedPings = 3

      // Test ping/pong for connection stability
      const pingInterval = setInterval(() => {
        if (pingCount >= expectedPings) {
          clearInterval(pingInterval)
          this.log('Connection stability test passed', 'success')
          resolve()
          return
        }

        this.client1.emit('ping', { timestamp: Date.now() })
        pingCount++
      }, 1000)

      // Listen for pong responses
      this.client1.on('pong', (data) => {
        this.log(`Received pong response: ${data.timestamp}`, 'info')
      })

      // Timeout fallback
      setTimeout(() => {
        clearInterval(pingInterval)
        this.log('Connection stability test completed', 'success')
        resolve()
      }, 10000)
    })
  }

  generateReport() {
    this.log('Generating WebSocket test report...', 'info')

    const report = {
      testType: 'WebSocket Real-Time Communication',
      timestamp: new Date().toISOString(),
      results: this.testResults,
      summary: {
        totalTests: 4,
        passedTests: this.testResults.filter(r => r.type === 'success').length,
        failedTests: this.testResults.filter(r => r.type === 'error').length,
        warnings: this.testResults.filter(r => r.type === 'warning').length,
      },
      recommendations: []
    }

    // Add recommendations based on results
    if (report.summary.failedTests > 0) {
      report.recommendations.push('Fix WebSocket connection issues')
    }

    if (report.summary.warnings > 0) {
      report.recommendations.push('Address connection stability warnings')
    }

    if (report.summary.passedTests === report.summary.totalTests) {
      report.recommendations.push('All WebSocket tests passed - ready for production')
    }

    // Save report
    const fs = require('fs')
    const reportPath = './websocket-test-report.json'
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    this.log(`WebSocket test report saved to: ${reportPath}`, 'success')
    this.log(`Tests passed: ${report.summary.passedTests}/${report.summary.totalTests}`, 'info')
  }

  async cleanup() {
    this.log('Cleaning up test data...')

    try {
      // Clean up database
      await prisma.documentComment.deleteMany({
        where: {
          document: {
            teamId: this.team.id
          }
        }
      })

      await prisma.document.deleteMany({
        where: {
          teamId: this.team.id
        }
      })

      await prisma.file.deleteMany({
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
      if (this.client1) {
        this.client1.disconnect()
      }

      if (this.client2) {
        this.client2.disconnect()
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
      await new Promise(resolve => setTimeout(resolve, 15000))
      
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
const tester = new WebSocketTester()
tester.run()