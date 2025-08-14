import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, assignmentsTable } from '../db/schema';
import { getCourseAssignments } from '../handlers/get_assignments';
import { eq } from 'drizzle-orm';

describe('getCourseAssignments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch all assignments for a course', async () => {
    // Create test teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherId,
        status: 'published'
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create test assignments with different statuses and scores
    await db.insert(assignmentsTable)
      .values([
        {
          course_id: courseId,
          title: 'Assignment 1',
          description: 'First assignment',
          max_score: '100.00', // String format for numeric column
          status: 'published'
        },
        {
          course_id: courseId,
          title: 'Assignment 2',
          description: 'Second assignment',
          max_score: '85.50', // String format for numeric column
          status: 'draft'
        },
        {
          course_id: courseId,
          title: 'Assignment 3',
          description: 'Third assignment',
          max_score: '75.25', // String format for numeric column
          status: 'closed'
        }
      ])
      .execute();

    // Fetch assignments
    const result = await getCourseAssignments(courseId);

    // Verify results
    expect(result).toHaveLength(3);
    
    // Check first assignment
    const assignment1 = result.find(a => a.title === 'Assignment 1');
    expect(assignment1).toBeDefined();
    expect(assignment1!.course_id).toEqual(courseId);
    expect(assignment1!.description).toEqual('First assignment');
    expect(assignment1!.max_score).toEqual(100.00);
    expect(typeof assignment1!.max_score).toBe('number');
    expect(assignment1!.status).toEqual('published');
    expect(assignment1!.id).toBeDefined();
    expect(assignment1!.created_at).toBeInstanceOf(Date);
    expect(assignment1!.updated_at).toBeInstanceOf(Date);

    // Check second assignment with decimal score
    const assignment2 = result.find(a => a.title === 'Assignment 2');
    expect(assignment2).toBeDefined();
    expect(assignment2!.max_score).toEqual(85.50);
    expect(typeof assignment2!.max_score).toBe('number');
    expect(assignment2!.status).toEqual('draft');

    // Check third assignment
    const assignment3 = result.find(a => a.title === 'Assignment 3');
    expect(assignment3).toBeDefined();
    expect(assignment3!.max_score).toEqual(75.25);
    expect(typeof assignment3!.max_score).toBe('number');
    expect(assignment3!.status).toEqual('closed');
  });

  it('should return empty array when course has no assignments', async () => {
    // Create test teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create test course without assignments
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Empty Course',
        description: 'A course with no assignments',
        teacher_id: teacherId,
        status: 'published'
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Fetch assignments
    const result = await getCourseAssignments(courseId);

    // Verify empty result
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent course', async () => {
    const nonExistentCourseId = 99999;

    // Fetch assignments for non-existent course
    const result = await getCourseAssignments(nonExistentCourseId);

    // Verify empty result
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should save assignments correctly in database', async () => {
    // Create test teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherId,
        status: 'published'
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create test assignment
    await db.insert(assignmentsTable)
      .values({
        course_id: courseId,
        title: 'Test Assignment',
        description: 'Assignment for testing',
        max_score: '95.75', // String format for numeric column
        status: 'published'
      })
      .execute();

    // Fetch assignments using handler
    const handlerResult = await getCourseAssignments(courseId);

    // Verify handler result
    expect(handlerResult).toHaveLength(1);
    expect(handlerResult[0].max_score).toEqual(95.75);

    // Directly query database to verify storage
    const dbResult = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.course_id, courseId))
      .execute();

    expect(dbResult).toHaveLength(1);
    expect(dbResult[0].title).toEqual('Test Assignment');
    expect(dbResult[0].description).toEqual('Assignment for testing');
    expect(dbResult[0].max_score).toEqual('95.75'); // Stored as string in DB
    expect(dbResult[0].status).toEqual('published');
    expect(dbResult[0].created_at).toBeInstanceOf(Date);
    expect(dbResult[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle assignments with due dates correctly', async () => {
    // Create test teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherId,
        status: 'published'
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    const dueDate = new Date('2024-12-31T23:59:59Z');

    // Create assignment with due date
    await db.insert(assignmentsTable)
      .values({
        course_id: courseId,
        title: 'Timed Assignment',
        description: 'Assignment with due date',
        due_date: dueDate,
        max_score: '100.00',
        status: 'published'
      })
      .execute();

    // Create assignment without due date
    await db.insert(assignmentsTable)
      .values({
        course_id: courseId,
        title: 'Open Assignment',
        description: 'Assignment without due date',
        max_score: '80.00',
        status: 'published'
      })
      .execute();

    // Fetch assignments
    const result = await getCourseAssignments(courseId);

    // Verify results
    expect(result).toHaveLength(2);

    const timedAssignment = result.find(a => a.title === 'Timed Assignment');
    expect(timedAssignment).toBeDefined();
    expect(timedAssignment!.due_date).toBeInstanceOf(Date);
    expect(timedAssignment!.due_date!.toISOString()).toEqual(dueDate.toISOString());

    const openAssignment = result.find(a => a.title === 'Open Assignment');
    expect(openAssignment).toBeDefined();
    expect(openAssignment!.due_date).toBeNull();
  });
});