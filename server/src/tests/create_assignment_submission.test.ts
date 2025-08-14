import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  assignmentsTable, 
  assignmentSubmissionsTable, 
  courseEnrollmentsTable 
} from '../db/schema';
import { type CreateAssignmentSubmissionInput } from '../schema';
import { createAssignmentSubmission } from '../handlers/create_assignment_submission';
import { eq, and } from 'drizzle-orm';

describe('createAssignmentSubmission', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;
  let studentId: number;
  let courseId: number;
  let assignmentId: number;

  beforeEach(async () => {
    // Create test teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hash',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    teacherId = teacherResult[0].id;

    // Create test student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hash',
        full_name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();
    studentId = studentResult[0].id;

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
    courseId = courseResult[0].id;

    // Enroll student in course
    await db.insert(courseEnrollmentsTable)
      .values({
        course_id: courseId,
        student_id: studentId
      })
      .execute();

    // Create test assignment
    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        course_id: courseId,
        title: 'Test Assignment',
        description: 'A test assignment',
        max_score: '100.00',
        status: 'published'
      })
      .returning()
      .execute();
    assignmentId = assignmentResult[0].id;
  });

  it('should create an assignment submission successfully', async () => {
    const input: CreateAssignmentSubmissionInput = {
      assignment_id: assignmentId,
      student_id: studentId,
      submission_text: 'My submission content',
      submission_url: 'https://example.com/submission.pdf'
    };

    const result = await createAssignmentSubmission(input);

    // Validate returned submission
    expect(result.assignment_id).toEqual(assignmentId);
    expect(result.student_id).toEqual(studentId);
    expect(result.submission_text).toEqual('My submission content');
    expect(result.submission_url).toEqual('https://example.com/submission.pdf');
    expect(result.status).toEqual('draft');
    expect(result.score).toBeNull();
    expect(result.feedback).toBeNull();
    expect(result.submitted_at).toBeNull();
    expect(result.graded_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save submission to database', async () => {
    const input: CreateAssignmentSubmissionInput = {
      assignment_id: assignmentId,
      student_id: studentId,
      submission_text: 'Database test submission'
    };

    const result = await createAssignmentSubmission(input);

    // Query database to verify
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, result.id))
      .execute();

    expect(submissions).toHaveLength(1);
    expect(submissions[0].assignment_id).toEqual(assignmentId);
    expect(submissions[0].student_id).toEqual(studentId);
    expect(submissions[0].submission_text).toEqual('Database test submission');
    expect(submissions[0].status).toEqual('draft');
  });

  it('should create submission with only text content', async () => {
    const input: CreateAssignmentSubmissionInput = {
      assignment_id: assignmentId,
      student_id: studentId,
      submission_text: 'Text only submission'
    };

    const result = await createAssignmentSubmission(input);

    expect(result.submission_text).toEqual('Text only submission');
    expect(result.submission_url).toBeNull();
    expect(result.status).toEqual('draft');
  });

  it('should create submission with only URL content', async () => {
    const input: CreateAssignmentSubmissionInput = {
      assignment_id: assignmentId,
      student_id: studentId,
      submission_url: 'https://example.com/project.zip'
    };

    const result = await createAssignmentSubmission(input);

    expect(result.submission_url).toEqual('https://example.com/project.zip');
    expect(result.submission_text).toBeNull();
    expect(result.status).toEqual('draft');
  });

  it('should throw error if assignment does not exist', async () => {
    const input: CreateAssignmentSubmissionInput = {
      assignment_id: 99999,
      student_id: studentId,
      submission_text: 'Test submission'
    };

    await expect(createAssignmentSubmission(input)).rejects.toThrow(/assignment not found/i);
  });

  it('should throw error if assignment is not published', async () => {
    // Create a draft assignment
    const draftAssignmentResult = await db.insert(assignmentsTable)
      .values({
        course_id: courseId,
        title: 'Draft Assignment',
        max_score: '100.00',
        status: 'draft'
      })
      .returning()
      .execute();

    const input: CreateAssignmentSubmissionInput = {
      assignment_id: draftAssignmentResult[0].id,
      student_id: studentId,
      submission_text: 'Test submission'
    };

    await expect(createAssignmentSubmission(input)).rejects.toThrow(/assignment is not published/i);
  });

  it('should throw error if student is not enrolled in course', async () => {
    // Create another student not enrolled in the course
    const unenrolledStudentResult = await db.insert(usersTable)
      .values({
        email: 'unenrolled@test.com',
        password_hash: 'hash',
        full_name: 'Unenrolled Student',
        role: 'student'
      })
      .returning()
      .execute();

    const input: CreateAssignmentSubmissionInput = {
      assignment_id: assignmentId,
      student_id: unenrolledStudentResult[0].id,
      submission_text: 'Test submission'
    };

    await expect(createAssignmentSubmission(input)).rejects.toThrow(/student is not enrolled/i);
  });

  it('should throw error if submission already exists', async () => {
    const input: CreateAssignmentSubmissionInput = {
      assignment_id: assignmentId,
      student_id: studentId,
      submission_text: 'First submission'
    };

    // Create first submission
    await createAssignmentSubmission(input);

    // Try to create second submission
    const duplicateInput: CreateAssignmentSubmissionInput = {
      assignment_id: assignmentId,
      student_id: studentId,
      submission_text: 'Duplicate submission'
    };

    await expect(createAssignmentSubmission(duplicateInput)).rejects.toThrow(/submission already exists/i);
  });

  it('should handle numeric score conversion correctly', async () => {
    const input: CreateAssignmentSubmissionInput = {
      assignment_id: assignmentId,
      student_id: studentId,
      submission_text: 'Test for score handling'
    };

    const result = await createAssignmentSubmission(input);

    // Score should be null initially
    expect(result.score).toBeNull();
    expect(typeof result.score).toBe('object'); // null is of type 'object'
  });

  it('should validate foreign key relationships', async () => {
    // Verify the created submission has correct relationships
    const input: CreateAssignmentSubmissionInput = {
      assignment_id: assignmentId,
      student_id: studentId,
      submission_text: 'Relationship test'
    };

    const result = await createAssignmentSubmission(input);

    // Verify assignment relationship
    const assignment = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, result.assignment_id))
      .execute();
    expect(assignment).toHaveLength(1);
    expect(assignment[0].course_id).toEqual(courseId);

    // Verify student relationship
    const student = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.student_id))
      .execute();
    expect(student).toHaveLength(1);
    expect(student[0].role).toEqual('student');

    // Verify enrollment relationship
    const enrollment = await db.select()
      .from(courseEnrollmentsTable)
      .where(and(
        eq(courseEnrollmentsTable.course_id, assignment[0].course_id),
        eq(courseEnrollmentsTable.student_id, result.student_id)
      ))
      .execute();
    expect(enrollment).toHaveLength(1);
  });
});