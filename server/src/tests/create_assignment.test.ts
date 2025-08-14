import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assignmentsTable, coursesTable, usersTable } from '../db/schema';
import { type CreateAssignmentInput } from '../schema';
import { createAssignment } from '../handlers/create_assignment';
import { eq } from 'drizzle-orm';

describe('createAssignment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create prerequisite data
  const createTestData = async () => {
    // Create a teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherResult[0].id,
        status: 'published'
      })
      .returning()
      .execute();

    return { teacher: teacherResult[0], course: courseResult[0] };
  };

  it('should create an assignment with all required fields', async () => {
    const { course } = await createTestData();

    const testInput: CreateAssignmentInput = {
      course_id: course.id,
      title: 'Test Assignment',
      description: 'A test assignment',
      due_date: new Date('2024-12-31T23:59:59Z'),
      max_score: 100,
      status: 'published'
    };

    const result = await createAssignment(testInput);

    // Verify basic fields
    expect(result.course_id).toEqual(course.id);
    expect(result.title).toEqual('Test Assignment');
    expect(result.description).toEqual('A test assignment');
    expect(result.due_date).toEqual(new Date('2024-12-31T23:59:59Z'));
    expect(result.max_score).toEqual(100);
    expect(typeof result.max_score).toBe('number'); // Verify numeric conversion
    expect(result.status).toEqual('published');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an assignment with minimal fields and defaults', async () => {
    const { course } = await createTestData();

    const testInput: CreateAssignmentInput = {
      course_id: course.id,
      title: 'Minimal Assignment',
      max_score: 50
    };

    const result = await createAssignment(testInput);

    // Verify fields with defaults
    expect(result.title).toEqual('Minimal Assignment');
    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.max_score).toEqual(50);
    expect(result.status).toEqual('draft'); // Default status
  });

  it('should save assignment to database correctly', async () => {
    const { course } = await createTestData();

    const testInput: CreateAssignmentInput = {
      course_id: course.id,
      title: 'Database Test Assignment',
      description: 'Testing database persistence',
      max_score: 75,
      status: 'draft'
    };

    const result = await createAssignment(testInput);

    // Query database to verify persistence
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, result.id))
      .execute();

    expect(assignments).toHaveLength(1);
    expect(assignments[0].title).toEqual('Database Test Assignment');
    expect(assignments[0].description).toEqual('Testing database persistence');
    expect(parseFloat(assignments[0].max_score)).toEqual(75); // Verify numeric storage
    expect(assignments[0].status).toEqual('draft');
    expect(assignments[0].course_id).toEqual(course.id);
    expect(assignments[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle decimal max_score values correctly', async () => {
    const { course } = await createTestData();

    const testInput: CreateAssignmentInput = {
      course_id: course.id,
      title: 'Decimal Score Assignment',
      max_score: 87.5
    };

    const result = await createAssignment(testInput);

    expect(result.max_score).toEqual(87.5);
    expect(typeof result.max_score).toBe('number');

    // Verify database storage
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, result.id))
      .execute();

    expect(parseFloat(assignments[0].max_score)).toEqual(87.5);
  });

  it('should handle due_date correctly when provided', async () => {
    const { course } = await createTestData();
    const dueDate = new Date('2024-06-15T14:30:00Z');

    const testInput: CreateAssignmentInput = {
      course_id: course.id,
      title: 'Timed Assignment',
      due_date: dueDate,
      max_score: 100
    };

    const result = await createAssignment(testInput);

    expect(result.due_date).toEqual(dueDate);

    // Verify database storage
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, result.id))
      .execute();

    expect(assignments[0].due_date).toEqual(dueDate);
  });

  it('should throw error when course does not exist', async () => {
    const testInput: CreateAssignmentInput = {
      course_id: 99999, // Non-existent course
      title: 'Invalid Course Assignment',
      max_score: 100
    };

    await expect(createAssignment(testInput)).rejects.toThrow(/course not found/i);
  });

  it('should handle all assignment status values', async () => {
    const { course } = await createTestData();

    const statuses = ['draft', 'published', 'closed'] as const;

    for (const status of statuses) {
      const testInput: CreateAssignmentInput = {
        course_id: course.id,
        title: `${status} Assignment`,
        max_score: 100,
        status
      };

      const result = await createAssignment(testInput);
      expect(result.status).toEqual(status);
    }
  });

  it('should create multiple assignments for the same course', async () => {
    const { course } = await createTestData();

    const assignment1Input: CreateAssignmentInput = {
      course_id: course.id,
      title: 'First Assignment',
      max_score: 50
    };

    const assignment2Input: CreateAssignmentInput = {
      course_id: course.id,
      title: 'Second Assignment',
      max_score: 75
    };

    const result1 = await createAssignment(assignment1Input);
    const result2 = await createAssignment(assignment2Input);

    // Verify both assignments are created with different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.course_id).toEqual(course.id);
    expect(result2.course_id).toEqual(course.id);
    expect(result1.title).toEqual('First Assignment');
    expect(result2.title).toEqual('Second Assignment');

    // Verify both exist in database
    const allAssignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.course_id, course.id))
      .execute();

    expect(allAssignments).toHaveLength(2);
  });
});