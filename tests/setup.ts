import { PrismaClient } from '@prisma/client'

// Global test setup
const prisma = new PrismaClient()

// Clean up database before each test
beforeEach(async () => {
  // Add any global test setup here
})

// Clean up database after all tests
afterAll(async () => {
  await prisma.$disconnect()
})

// Global test utilities
global.testUtils = {
  async createTestUser(overrides = {}) {
    const defaultUser = {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      password: 'testpassword123',
      role: 'USER',
      plan: 'FREE',
      emailVerified: true,
      ...overrides
    }
    
    return await prisma.user.create({
      data: defaultUser
    })
  },

  async createTestTeam(ownerId, overrides = {}) {
    const defaultTeam = {
      name: 'Test Team',
      description: 'Team for testing',
      ownerId,
      ...overrides
    }
    
    return await prisma.team.create({
      data: defaultTeam
    })
  },

  async cleanupTestData() {
    // Clean up test data in reverse order of dependencies
    await prisma.documentComment.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-'
          }
        }
      }
    })
    
    await prisma.documentVersion.deleteMany({
      where: {
        document: {
          user: {
            email: {
              contains: 'test-'
            }
          }
        }
      }
    })
    
    await prisma.document.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-'
          }
        }
      }
    })
    
    await prisma.file.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-'
          }
        }
      }
    })
    
    await prisma.mail.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-'
          }
        }
      }
    })
    
    await prisma.meetMessage.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-'
          }
        }
      }
    })
    
    await prisma.meetParticipant.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-'
          }
        }
      }
    })
    
    await prisma.meetRoom.deleteMany({
      where: {
        host: {
          email: {
            contains: 'test-'
          }
        }
      }
    })
    
    await prisma.teamMember.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-'
          }
        }
      }
    })
    
    await prisma.team.deleteMany({
      where: {
        owner: {
          email: {
            contains: 'test-'
          }
        }
      }
    })
    
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-'
        }
      }
    })
  }
}