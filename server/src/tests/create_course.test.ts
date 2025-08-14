import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type CreateCourseInput } from '../schema';
import { createCourse } from '../handlers/create_course';
import { eq } from 'drizzle-orm';

describe('createCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test users for different scenarios
  const teacherUser = {
    email: 'teacher@example.com',
    password_hash: 'hashedpassword',
    full_name: 'Test Teacher',
    role: 'teacher' as const,
    is_active: true
  };

  const adminUser = {
    email: 'admin@example.com',
    password_hash: 'hashedpassword',
    full_name: 'Test Admin',
    role: 'admin' as const,
    is_active: true
  };

  const studentUser = {
    email: 'student@example.com',
    password_hash: 'hashedpassword',
    full_name: 'Test Student',
    role: 'student' as const,
    is_active: true
  };

  const inactiveTeacher = {
    email: 'inactive@example.com',
    password_hash: 'hashedpassword',
    full_name: 'Inactive Teacher',
    role: 'teacher' as const,
    is_active: false
  };

  it('should create a course with teacher', async () => {
    // Create teacher user first
    const teacherResult = await db.insert(usersTable)
      .values(teacherUser)
      .returning()
      .execute();

    const testInput: CreateCourseInput = {
      title: 'Introduction to Programming',
      description: 'A comprehensive course on programming basics',
      teacher_id: teacherResult[0].id,
      thumbnail_url: 'https://example.com/thumbnail.jpg',
      status: 'draft'
    };

    const result = await createCourse(testInput);

    // Validate basic properties
    expect(result.title).toEqual('Introduction to Programming');
    expect(result.description).toEqual('A comprehensive course on programming basics');
    expect(result.teacher_id).toEqual(teacherResult[0].id);
    expect(result.thumbnail_url).toEqual('https://example.com/thumbnail.jpg');
    expect(result.status).toEqual('draft');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a course with admin user', async () => {
    // Create admin user first
    const adminResult = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    const testInput: CreateCourseInput = {
      title: 'Advanced Mathematics',
      teacher_id: adminResult[0].id
    };

    const result = await createCourse(testInput);

    expect(result.title).toEqual('Advanced Mathematics');
    expect(result.teacher_id).toEqual(adminResult[0].id);
    expect(result.status).toEqual('draft'); // Default status
    expect(result.description).toBeNull(); // Optional field
    expect(result.thumbnail_url).toBeNull(); // Optional field
  });

  it('should save course to database', async () => {
    // Create teacher user first
    const teacherResult = await db.insert(usersTable)
      .values(teacherUser)
      .returning()
      .execute();

    const testInput: CreateCourseInput = {
      title: 'Database Systems',
      description: 'Learn about relational databases',
      teacher_id: teacherResult[0].id,
      status: 'published'
    };

    const result = await createCourse(testInput);

    // Query database to verify course was saved
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, result.id))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].title).toEqual('Database Systems');
    expect(courses[0].description).toEqual('Learn about relational databases');
    expect(courses[0].teacher_id).toEqual(teacherResult[0].id);
    expect(courses[0].status).toEqual('published');
    expect(courses[0].created_at).toBeInstanceOf(Date);
    expect(courses[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when teacher does not exist', async () => {
    const testInput: CreateCourseInput = {
      title: 'Non-existent Teacher Course',
      teacher_id: 999 // Non-existent teacher ID
    };

    await expect(createCourse(testInput)).rejects.toThrow(/teacher not found/i);
  });

  it('should throw error when user is not a teacher or admin', async () => {
    // Create student user
    const studentResult = await db.insert(usersTable)
      .values(studentUser)
      .returning()
      .execute();

    const testInput: CreateCourseInput = {
      title: 'Student Attempted Course',
      teacher_id: studentResult[0].id
    };

    await expect(createCourse(testInput)).rejects.toThrow(/only teachers and admins can create courses/i);
  });

  it('should throw error when teacher account is inactive', async () => {
    // Create inactive teacher user
    const inactiveResult = await db.insert(usersTable)
      .values(inactiveTeacher)
      .returning()
      .execute();

    const testInput: CreateCourseInput = {
      title: 'Inactive Teacher Course',
      teacher_id: inactiveResult[0].id
    };

    await expect(createCourse(testInput)).rejects.toThrow(/teacher account is not active/i);
  });

  it('should handle minimal input with defaults', async () => {
    // Create teacher user first
    const teacherResult = await db.insert(usersTable)
      .values(teacherUser)
      .returning()
      .execute();

    const testInput: CreateCourseInput = {
      title: 'Minimal Course',
      teacher_id: teacherResult[0].id
    };

    const result = await createCourse(testInput);

    expect(result.title).toEqual('Minimal Course');
    expect(result.teacher_id).toEqual(teacherResult[0].id);
    expect(result.status).toEqual('draft'); // Default status
    expect(result.description).toBeNull();
    expect(result.thumbnail_url).toBeNull();
  });

  it('should create multiple courses for same teacher', async () => {
    // Create teacher user first
    const teacherResult = await db.insert(usersTable)
      .values(teacherUser)
      .returning()
      .execute();

    const course1Input: CreateCourseInput = {
      title: 'Course 1',
      teacher_id: teacherResult[0].id,
      status: 'draft'
    };

    const course2Input: CreateCourseInput = {
      title: 'Course 2',
      teacher_id: teacherResult[0].id,
      status: 'published'
    };

    const result1 = await createCourse(course1Input);
    const result2 = await createCourse(course2Input);

    expect(result1.title).toEqual('Course 1');
    expect(result1.status).toEqual('draft');
    expect(result2.title).toEqual('Course 2');
    expect(result2.status).toEqual('published');
    expect(result1.id).not.toEqual(result2.id);

    // Verify both courses exist in database
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.teacher_id, teacherResult[0].id))
      .execute();

    expect(courses).toHaveLength(2);
  });
});