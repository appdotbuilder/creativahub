import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, portfolioProjectsTable } from '../db/schema';
import { type GetStudentPortfolioInput } from '../schema';
import { getStudentPortfolio, getPublicPortfolioProjects } from '../handlers/get_portfolio_projects';
import { eq } from 'drizzle-orm';

describe('getStudentPortfolio', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all portfolio projects for a specific student', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hash',
        full_name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const student = userResult[0];

    // Create first project
    await db.insert(portfolioProjectsTable)
      .values({
        student_id: student.id,
        title: 'Project 1',
        description: 'First project',
        project_url: 'https://project1.com',
        is_public: true
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second project
    await db.insert(portfolioProjectsTable)
      .values({
        student_id: student.id,
        title: 'Project 2',
        description: 'Second project',
        project_url: 'https://project2.com',
        is_public: false
      })
      .execute();

    // Test input
    const input: GetStudentPortfolioInput = {
      student_id: student.id
    };

    // Execute handler
    const result = await getStudentPortfolio(input);

    // Verify results
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Project 2'); // Newest first (created later)
    expect(result[0].student_id).toBe(student.id);
    expect(result[0].is_public).toBe(false);
    expect(result[1].title).toBe('Project 1'); // Older second
    expect(result[1].student_id).toBe(student.id);
    expect(result[1].is_public).toBe(true);
  });

  it('should return empty array for student with no projects', async () => {
    // Create test user without any projects
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hash',
        full_name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const student = userResult[0];

    const input: GetStudentPortfolioInput = {
      student_id: student.id
    };

    const result = await getStudentPortfolio(input);

    expect(result).toHaveLength(0);
  });

  it('should return projects in correct chronological order', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hash',
        full_name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const student = userResult[0];

    // Create projects with small delay to ensure different timestamps
    const project1 = await db.insert(portfolioProjectsTable)
      .values({
        student_id: student.id,
        title: 'Older Project',
        description: 'Created first',
        is_public: true
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const project2 = await db.insert(portfolioProjectsTable)
      .values({
        student_id: student.id,
        title: 'Newer Project',
        description: 'Created second',
        is_public: true
      })
      .returning()
      .execute();

    const input: GetStudentPortfolioInput = {
      student_id: student.id
    };

    const result = await getStudentPortfolio(input);

    // Should return newest first
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Newer Project');
    expect(result[1].title).toBe('Older Project');
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
  });

  it('should only return projects for the specified student', async () => {
    // Create two different students
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'student1@test.com',
          password_hash: 'hash',
          full_name: 'Student 1',
          role: 'student'
        },
        {
          email: 'student2@test.com',
          password_hash: 'hash',
          full_name: 'Student 2',
          role: 'student'
        }
      ])
      .returning()
      .execute();

    const student1 = users[0];
    const student2 = users[1];

    // Create projects for both students
    await db.insert(portfolioProjectsTable)
      .values([
        {
          student_id: student1.id,
          title: 'Student 1 Project',
          description: 'Project by student 1',
          is_public: true
        },
        {
          student_id: student2.id,
          title: 'Student 2 Project',
          description: 'Project by student 2',
          is_public: true
        }
      ])
      .execute();

    const input: GetStudentPortfolioInput = {
      student_id: student1.id
    };

    const result = await getStudentPortfolio(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Student 1 Project');
    expect(result[0].student_id).toBe(student1.id);
  });

  it('should include all project fields in response', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hash',
        full_name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const student = userResult[0];

    // Create portfolio project with all fields
    await db.insert(portfolioProjectsTable)
      .values({
        student_id: student.id,
        title: 'Complete Project',
        description: 'Project with all fields',
        project_url: 'https://project.com',
        thumbnail_url: 'https://thumbnail.com/image.jpg',
        tags: 'javascript,react,nodejs',
        is_public: true
      })
      .execute();

    const input: GetStudentPortfolioInput = {
      student_id: student.id
    };

    const result = await getStudentPortfolio(input);

    expect(result).toHaveLength(1);
    const project = result[0];
    
    expect(project.id).toBeDefined();
    expect(project.student_id).toBe(student.id);
    expect(project.title).toBe('Complete Project');
    expect(project.description).toBe('Project with all fields');
    expect(project.project_url).toBe('https://project.com');
    expect(project.thumbnail_url).toBe('https://thumbnail.com/image.jpg');
    expect(project.tags).toBe('javascript,react,nodejs');
    expect(project.is_public).toBe(true);
    expect(project.created_at).toBeInstanceOf(Date);
    expect(project.updated_at).toBeInstanceOf(Date);
  });
});

describe('getPublicPortfolioProjects', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return only public portfolio projects', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'student1@test.com',
          password_hash: 'hash',
          full_name: 'Student 1',
          role: 'student'
        },
        {
          email: 'student2@test.com',
          password_hash: 'hash',
          full_name: 'Student 2',
          role: 'student'
        }
      ])
      .returning()
      .execute();

    const student1 = users[0];
    const student2 = users[1];

    // Create mix of public and private projects
    await db.insert(portfolioProjectsTable)
      .values([
        {
          student_id: student1.id,
          title: 'Public Project 1',
          description: 'This is public',
          is_public: true
        },
        {
          student_id: student1.id,
          title: 'Private Project 1',
          description: 'This is private',
          is_public: false
        },
        {
          student_id: student2.id,
          title: 'Public Project 2',
          description: 'This is also public',
          is_public: true
        },
        {
          student_id: student2.id,
          title: 'Private Project 2',
          description: 'This is also private',
          is_public: false
        }
      ])
      .execute();

    const result = await getPublicPortfolioProjects();

    expect(result).toHaveLength(2);
    
    // Verify only public projects are returned
    const titles = result.map(p => p.title);
    expect(titles).toContain('Public Project 1');
    expect(titles).toContain('Public Project 2');
    expect(titles).not.toContain('Private Project 1');
    expect(titles).not.toContain('Private Project 2');

    // Verify all returned projects are public
    result.forEach(project => {
      expect(project.is_public).toBe(true);
    });
  });

  it('should return empty array when no public projects exist', async () => {
    // Create test user with only private projects
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hash',
        full_name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const student = userResult[0];

    await db.insert(portfolioProjectsTable)
      .values({
        student_id: student.id,
        title: 'Private Project',
        description: 'This is private',
        is_public: false
      })
      .execute();

    const result = await getPublicPortfolioProjects();

    expect(result).toHaveLength(0);
  });

  it('should return projects in chronological order (newest first)', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hash',
        full_name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const student = userResult[0];

    // Create public projects with delay to ensure different timestamps
    await db.insert(portfolioProjectsTable)
      .values({
        student_id: student.id,
        title: 'Older Public Project',
        description: 'Created first',
        is_public: true
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(portfolioProjectsTable)
      .values({
        student_id: student.id,
        title: 'Newer Public Project',
        description: 'Created second',
        is_public: true
      })
      .execute();

    const result = await getPublicPortfolioProjects();

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Newer Public Project');
    expect(result[1].title).toBe('Older Public Project');
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
  });

  it('should include projects from multiple students', async () => {
    // Create multiple students
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'student1@test.com',
          password_hash: 'hash1',
          full_name: 'Student 1',
          role: 'student'
        },
        {
          email: 'student2@test.com',
          password_hash: 'hash2',
          full_name: 'Student 2',
          role: 'student'
        },
        {
          email: 'student3@test.com',
          password_hash: 'hash3',
          full_name: 'Student 3',
          role: 'student'
        }
      ])
      .returning()
      .execute();

    // Create public projects for different students
    await db.insert(portfolioProjectsTable)
      .values([
        {
          student_id: users[0].id,
          title: 'Project by Student 1',
          description: 'Public project',
          is_public: true
        },
        {
          student_id: users[1].id,
          title: 'Project by Student 2',
          description: 'Another public project',
          is_public: true
        },
        {
          student_id: users[2].id,
          title: 'Project by Student 3',
          description: 'Third public project',
          is_public: true
        }
      ])
      .execute();

    const result = await getPublicPortfolioProjects();

    expect(result).toHaveLength(3);
    
    // Verify we have projects from different students
    const studentIds = result.map(p => p.student_id);
    expect(studentIds).toContain(users[0].id);
    expect(studentIds).toContain(users[1].id);
    expect(studentIds).toContain(users[2].id);
  });

  it('should include all project fields in response', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hash',
        full_name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const student = userResult[0];

    // Create public portfolio project with all fields
    await db.insert(portfolioProjectsTable)
      .values({
        student_id: student.id,
        title: 'Complete Public Project',
        description: 'Public project with all fields',
        project_url: 'https://publicproject.com',
        thumbnail_url: 'https://thumbnail.com/public.jpg',
        tags: 'html,css,javascript',
        is_public: true
      })
      .execute();

    const result = await getPublicPortfolioProjects();

    expect(result).toHaveLength(1);
    const project = result[0];
    
    expect(project.id).toBeDefined();
    expect(project.student_id).toBe(student.id);
    expect(project.title).toBe('Complete Public Project');
    expect(project.description).toBe('Public project with all fields');
    expect(project.project_url).toBe('https://publicproject.com');
    expect(project.thumbnail_url).toBe('https://thumbnail.com/public.jpg');
    expect(project.tags).toBe('html,css,javascript');
    expect(project.is_public).toBe(true);
    expect(project.created_at).toBeInstanceOf(Date);
    expect(project.updated_at).toBeInstanceOf(Date);
  });
});