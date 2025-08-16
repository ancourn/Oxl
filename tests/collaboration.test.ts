import { NextRequest, NextResponse } from 'next/server'
import { createMocks } from 'node-mocks-http'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

describe('Collaboration Features - Docs & Drive', () => {
  let testUser1: any
  let testUser2: any
  let testTeam: any
  let testDocument: any
  let testFolder: any

  beforeEach(async () => {
    // Create test users
    testUser1 = await global.testUtils.createTestUser({
      name: 'Collaborator 1',
      email: `collab1-${Date.now()}@example.com`
    })

    testUser2 = await global.testUtils.createTestUser({
      name: 'Collaborator 2',
      email: `collab2-${Date.now()}@example.com`
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

    // Create test document
    testDocument = await db.document.create({
      data: {
        title: 'Collaboration Test Document',
        content: '<h1>Initial Content</h1>',
        teamId: testTeam.id,
        userId: testUser1.id
      }
    })

    // Create test folder
    testFolder = await db.file.create({
      data: {
        name: 'Collaboration Test Folder',
        path: '/folder/collaboration',
        size: 0,
        mimeType: 'folder',
        bucket: 'default',
        key: `folder-${Date.now()}`,
        teamId: testTeam.id,
        userId: testUser1.id,
        isFolder: true
      }
    })
  })

  afterEach(async () => {
    await global.testUtils.cleanupTestData()
  })

  describe('Document Collaboration', () => {
    test('should allow multiple users to edit document', async () => {
      // Simulate user1 editing document
      const updatedContent1 = '<h1>Updated by User 1</h1><p>New content</p>'
      const documentV1 = await db.document.update({
        where: { id: testDocument.id },
        data: { content: updatedContent1 }
      })

      // Simulate user2 editing document
      const updatedContent2 = '<h1>Updated by User 2</h1><p>Collaborative content</p>'
      const documentV2 = await db.document.update({
        where: { id: testDocument.id },
        data: { content: updatedContent2 }
      })

      // Verify document was updated
      const finalDocument = await db.document.findUnique({
        where: { id: testDocument.id },
        include: {
          versions: {
            orderBy: { version: 'desc' }
          }
        }
      })

      expect(finalDocument).toBeTruthy()
      expect(finalDocument?.content).toBe(updatedContent2)
      expect(finalDocument?.versions).toHaveLength(1) // Initial version
    })

    test('should track document versions correctly', async () => {
      // Create initial version
      await db.documentVersion.create({
        data: {
          documentId: testDocument.id,
          version: 1,
          content: testDocument.content
        }
      })

      // Update document content
      const newContent = '<h1>Updated Content</h1>'
      await db.document.update({
        where: { id: testDocument.id },
        data: { content: newContent }
      })

      // Create second version
      await db.documentVersion.create({
        data: {
          documentId: testDocument.id,
          version: 2,
          content: newContent
        }
      })

      // Verify versions
      const versions = await db.documentVersion.findMany({
        where: { documentId: testDocument.id },
        orderBy: { version: 'desc' }
      })

      expect(versions).toHaveLength(2)
      expect(versions[0].version).toBe(2)
      expect(versions[1].version).toBe(1)
    })

    test('should allow collaborative commenting', async () => {
      // User1 adds comment
      const comment1 = await db.documentComment.create({
        data: {
          documentId: testDocument.id,
          userId: testUser1.id,
          content: 'Great start on this document!'
        },
        include: { user: true }
      })

      // User2 adds comment
      const comment2 = await db.documentComment.create({
        data: {
          documentId: testDocument.id,
          userId: testUser2.id,
          content: 'Thanks! I\'ll add more details.'
        },
        include: { user: true }
      })

      // Verify comments
      const comments = await db.documentComment.findMany({
        where: { documentId: testDocument.id },
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      })

      expect(comments).toHaveLength(2)
      expect(comments[0].user.id).toBe(testUser2.id)
      expect(comments[1].user.id).toBe(testUser1.id)
    })

    test('should handle document sharing', async () => {
      // Share document with team
      const sharedDocument = await db.document.update({
        where: { id: testDocument.id },
        data: {
          isShared: true,
          shareToken: randomUUID()
        }
      })

      expect(sharedDocument.isShared).toBe(true)
      expect(sharedDocument.shareToken).toBeTruthy()

      // Verify team members can access
      const teamDocuments = await db.document.findMany({
        where: {
          teamId: testTeam.id,
          isDeleted: false
        }
      })

      expect(teamDocuments).toHaveLength(1)
      expect(teamDocuments[0].id).toBe(testDocument.id)
    })
  })

  describe('Drive Collaboration', () => {
    test('should allow folder sharing', async () => {
      // Share folder
      const sharedFolder = await db.file.update({
        where: { id: testFolder.id },
        data: {
          isShared: true,
          shareToken: randomUUID(),
          shareExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      })

      expect(sharedFolder.isShared).toBe(true)
      expect(sharedFolder.shareToken).toBeTruthy()
      expect(sharedFolder.shareExpiry).toBeTruthy()
    })

    test('should handle nested folder collaboration', async () => {
      // Create subfolder
      const subfolder = await db.file.create({
        data: {
          name: 'Subfolder',
          path: '/folder/collaboration/subfolder',
          size: 0,
          mimeType: 'folder',
          bucket: 'default',
          key: `folder-${Date.now()}`,
          teamId: testTeam.id,
          userId: testUser2.id,
          parentId: testFolder.id,
          isFolder: true
        }
      })

      // Create file in subfolder
      const file = await db.file.create({
        data: {
          name: 'collaboration-test.txt',
          path: '/files/collaboration-test.txt',
          size: 1024,
          mimeType: 'text/plain',
          bucket: 'default',
          key: `file-${Date.now()}`,
          teamId: testTeam.id,
          userId: testUser1.id,
          parentId: subfolder.id,
          isFolder: false
        }
      })

      // Verify structure
      const folderContents = await db.file.findMany({
        where: {
          parentId: testFolder.id,
          isDeleted: false
        }
      })

      expect(folderContents).toHaveLength(1)
      expect(folderContents[0].id).toBe(subfolder.id)

      const subfolderContents = await db.file.findMany({
        where: {
          parentId: subfolder.id,
          isDeleted: false
        }
      })

      expect(subfolderContents).toHaveLength(1)
      expect(subfolderContents[0].id).toBe(file.id)
    })

    test('should handle file versioning', async () => {
      // Create initial file
      const file = await db.file.create({
        data: {
          name: 'version-test.txt',
          path: '/files/version-test.txt',
          size: 1024,
          mimeType: 'text/plain',
          bucket: 'default',
          key: `file-${Date.now()}`,
          teamId: testTeam.id,
          userId: testUser1.id,
          parentId: testFolder.id,
          isFolder: false
        }
      })

      // Update file (simulate new version)
      const updatedFile = await db.file.update({
        where: { id: file.id },
        data: {
          size: 2048, // Larger size indicates new version
          key: `file-${Date.now()}-v2`
        }
      })

      expect(updatedFile.size).toBe(2048)
      expect(updatedFile.key).not.toBe(file.key)
    })

    test('should calculate storage usage correctly', async () => {
      // Create multiple files
      const file1 = await db.file.create({
        data: {
          name: 'test1.txt',
          path: '/files/test1.txt',
          size: 1024,
          mimeType: 'text/plain',
          bucket: 'default',
          key: `file-${Date.now()}`,
          teamId: testTeam.id,
          userId: testUser1.id,
          parentId: testFolder.id,
          isFolder: false
        }
      })

      const file2 = await db.file.create({
        data: {
          name: 'test2.txt',
          path: '/files/test2.txt',
          size: 2048,
          mimeType: 'text/plain',
          bucket: 'default',
          key: `file-${Date.now()}`,
          teamId: testTeam.id,
          userId: testUser2.id,
          parentId: testFolder.id,
          isFolder: false
        }
      })

      // Calculate storage usage
      const storageResult = await db.file.aggregate({
        where: {
          teamId: testTeam.id,
          isDeleted: false,
          isFolder: false
        },
        _sum: {
          size: true
        },
        _count: {
          _all: true
        }
      })

      expect(storageResult._sum.size).toBe(3072) // 1024 + 2048
      expect(storageResult._count._all).toBe(2)
    })
  })

  describe('Real-time Collaboration Simulation', () => {
    test('should simulate concurrent document editing', async () => {
      // Simulate multiple users editing simultaneously
      const editOperations = [
        { userId: testUser1.id, content: '<h1>User 1 Edit</h1>' },
        { userId: testUser2.id, content: '<h1>User 2 Edit</h1>' },
        { userId: testUser1.id, content: '<h1>User 1 Final Edit</h1>' }
      ]

      let finalContent = testDocument.content
      for (const operation of editOperations) {
        finalContent = operation.content
        await db.document.update({
          where: { id: testDocument.id },
          data: { content: finalContent }
        })
      }

      const finalDocument = await db.document.findUnique({
        where: { id: testDocument.id }
      })

      expect(finalDocument?.content).toBe('<h1>User 1 Final Edit</h1>')
    })

    test('should handle collaborative folder creation', async () => {
      // Both users create folders
      const folder1 = await db.file.create({
        data: {
          name: 'User 1 Folder',
          path: '/folder/user1-folder',
          size: 0,
          mimeType: 'folder',
          bucket: 'default',
          key: `folder-${Date.now()}`,
          teamId: testTeam.id,
          userId: testUser1.id,
          isFolder: true
        }
      })

      const folder2 = await db.file.create({
        data: {
          name: 'User 2 Folder',
          path: '/folder/user2-folder',
          size: 0,
          mimeType: 'folder',
          bucket: 'default',
          key: `folder-${Date.now()}`,
          teamId: testTeam.id,
          userId: testUser2.id,
          isFolder: true
        }
      })

      // Verify both folders exist
      const teamFolders = await db.file.findMany({
        where: {
          teamId: testTeam.id,
          isFolder: true,
          isDeleted: false
        }
      })

      expect(teamFolders.length).toBeGreaterThanOrEqual(2) // At least the 2 new folders
    })
  })
})