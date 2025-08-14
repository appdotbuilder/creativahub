import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { portfolioProjectsTable, usersTable } from '../db/schema';
import { type CreatePortfolioProjectInput } from '../schema';
import { createPortfolioProject } from '../handlers/create_portfolio_project';
import { eq } from 'drizzle-orm';

// Test student user
const testStudent = {
  email: 'student@test.com',
  password_hash: 'hashed_password',
  full_name: 'Test Student',
  role: 'student' as const,
  avatar_url: null,
  is_active: true
};

// Test teacher user
const testTeacher = {
  email: 'teacher@test.com',
  password_hash: 'hashed_password',
  full_name: 'Test Teacher',
  role: 'teacher' as const,
  avatar_url: null,
  is_active: true
};

// Test inactive student
const inactiveStudent = {
  email: 'inactive@test.com',
  password_hash: 'hashed_password',
  full_name: 'Inactive Student',
  role: 'student' as const,
  avatar_url: null,
  is_active: false
};

// Complete test input with all fields
const testInput: CreatePortfolioProjectInput = {
  student_id: 1,
  title: 'My Web Development Project',
  description: 'A full-stack web application built with React and Node.js',
  project_url: 'https://github.com/student/project',
  thumbnail_url: 'https://example.com/thumbnail.jpg',
  tags: 'react,nodejs,fullstack',
  is_public: true
};

// Minimal test input
const minimalInput: CreatePortfolioProjectInput = {
  student_id: 1,
  title: 'Simple Project'
};

describe('createPortfolioProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a portfolio project with all fields', async () => {
    // Create prerequisite student
    const studentResult = await db.insert(usersTable)
      .values(testStudent)
      .returning()
      .execute();
    
    const inputWithValidId = {
      ...testInput,
      student_id: studentResult[0].id
    };

    const result = await createPortfolioProject(inputWithValidId);

    // Verify all fields
    expect(result.student_id).toEqual(studentResult[0].id);
    expect(result.title).toEqual('My Web Development Project');
    expect(result.description).toEqual('A full-stack web application built with React and Node.js');
    expect(result.project_url).toEqual('https://github.com/student/project');
    expect(result.thumbnail_url).toEqual('https://example.com/thumbnail.jpg');
    expect(result.tags).toEqual('react,nodejs,fullstack');
    expect(result.is_public).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a portfolio project with minimal fields', async () => {
    // Create prerequisite student
    const studentResult = await db.insert(usersTable)
      .values(testStudent)
      .returning()
      .execute();

    const inputWithValidId = {
      ...minimalInput,
      student_id: studentResult[0].id
    };

    const result = await createPortfolioProject(inputWithValidId);

    // Verify required fields
    expect(result.student_id).toEqual(studentResult[0].id);
    expect(result.title).toEqual('Simple Project');
    expect(result.description).toBeNull();
    expect(result.project_url).toBeNull();
    expect(result.thumbnail_url).toBeNull();
    expect(result.tags).toBeNull();
    expect(result.is_public).toEqual(false); // Default value from Zod schema
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save portfolio project to database', async () => {
    // Create prerequisite student
    const studentResult = await db.insert(usersTable)
      .values(testStudent)
      .returning()
      .execute();

    const inputWithValidId = {
      ...testInput,
      student_id: studentResult[0].id
    };

    const result = await createPortfolioProject(inputWithValidId);

    // Query database to verify persistence
    const projects = await db.select()
      .from(portfolioProjectsTable)
      .where(eq(portfolioProjectsTable.id, result.id))
      .execute();

    expect(projects).toHaveLength(1);
    expect(projects[0].student_id).toEqual(studentResult[0].id);
    expect(projects[0].title).toEqual('My Web Development Project');
    expect(projects[0].description).toEqual('A full-stack web application built with React and Node.js');
    expect(projects[0].project_url).toEqual('https://github.com/student/project');
    expect(projects[0].thumbnail_url).toEqual('https://example.com/thumbnail.jpg');
    expect(projects[0].tags).toEqual('react,nodejs,fullstack');
    expect(projects[0].is_public).toEqual(true);
    expect(projects[0].created_at).toBeInstanceOf(Date);
    expect(projects[0].updated_at).toBeInstanceOf(Date);
  });

  it('should reject creation for non-existent student', async () => {
    const inputWithInvalidId = {
      ...testInput,
      student_id: 999 // Non-existent ID
    };

    await expect(createPortfolioProject(inputWithInvalidId))
      .rejects.toThrow(/student not found/i);
  });

  it('should reject creation for non-student user', async () => {
    // Create a teacher user
    const teacherResult = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();

    const inputWithTeacherId = {
      ...testInput,
      student_id: teacherResult[0].id
    };

    await expect(createPortfolioProject(inputWithTeacherId))
      .rejects.toThrow(/must be a student/i);
  });

  it('should reject creation for inactive student', async () => {
    // Create inactive student
    const studentResult = await db.insert(usersTable)
      .values(inactiveStudent)
      .returning()
      .execute();

    const inputWithInactiveId = {
      ...testInput,
      student_id: studentResult[0].id
    };

    await expect(createPortfolioProject(inputWithInactiveId))
      .rejects.toThrow(/account is not active/i);
  });

  it('should handle multiple projects for same student', async () => {
    // Create prerequisite student
    const studentResult = await db.insert(usersTable)
      .values(testStudent)
      .returning()
      .execute();

    // Create first project
    const firstProject = await createPortfolioProject({
      student_id: studentResult[0].id,
      title: 'First Project',
      is_public: true
    });

    // Create second project
    const secondProject = await createPortfolioProject({
      student_id: studentResult[0].id,
      title: 'Second Project',
      is_public: false
    });

    // Verify both projects exist
    expect(firstProject.id).not.toEqual(secondProject.id);
    expect(firstProject.title).toEqual('First Project');
    expect(firstProject.is_public).toEqual(true);
    expect(secondProject.title).toEqual('Second Project');
    expect(secondProject.is_public).toEqual(false);

    // Verify both are in database
    const allProjects = await db.select()
      .from(portfolioProjectsTable)
      .where(eq(portfolioProjectsTable.student_id, studentResult[0].id))
      .execute();

    expect(allProjects).toHaveLength(2);
  });

  it('should handle null and undefined optional fields correctly', async () => {
    // Create prerequisite student
    const studentResult = await db.insert(usersTable)
      .values(testStudent)
      .returning()
      .execute();

    // Test with explicit null values
    const result = await createPortfolioProject({
      student_id: studentResult[0].id,
      title: 'Test Project',
      description: null,
      project_url: null,
      thumbnail_url: null,
      tags: null
      // is_public not provided, should default to false
    });

    expect(result.description).toBeNull();
    expect(result.project_url).toBeNull();
    expect(result.thumbnail_url).toBeNull();
    expect(result.tags).toBeNull();
    expect(result.is_public).toEqual(false);
  });
});