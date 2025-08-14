import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, assignmentsTable, assignmentSubmissionsTable } from '../db/schema';
import { type GradeAssignmentSubmissionInput } from '../schema';
import { gradeAssignmentSubmission } from '../handlers/grade_assignment_submission';
import { eq } from 'drizzle-orm';

describe('gradeAssignmentSubmission', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;
  let studentId: number;
  let courseId: number;
  let assignmentId: number;
  let submissionId: number;

  beforeEach(async () => {
    // Create test teacher
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    teacherId = teacher[0].id;

    // Create test student
    const student = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();
    studentId = student[0].id;

    // Create test course
    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherId,
        status: 'published'
      })
      .returning()
      .execute();
    courseId = course[0].id;

    // Create test assignment
    const assignment = await db.insert(assignmentsTable)
      .values({
        course_id: courseId,
        title: 'Test Assignment',
        description: 'An assignment for testing',
        max_score: 100.0.toString(), // Convert to string for numeric column
        status: 'published'
      })
      .returning()
      .execute();
    assignmentId = assignment[0].id;

    // Create test submission
    const submission = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignmentId,
        student_id: studentId,
        submission_text: 'This is my submission',
        status: 'submitted',
        submitted_at: new Date()
      })
      .returning()
      .execute();
    submissionId = submission[0].id;
  });

  it('should grade a submission successfully', async () => {
    const input: GradeAssignmentSubmissionInput = {
      id: submissionId,
      score: 85.5,
      feedback: 'Good work, but could improve on X'
    };

    const result = await gradeAssignmentSubmission(input);

    // Verify returned data
    expect(result.id).toEqual(submissionId);
    expect(result.assignment_id).toEqual(assignmentId);
    expect(result.student_id).toEqual(studentId);
    expect(result.score).toEqual(85.5);
    expect(result.feedback).toEqual('Good work, but could improve on X');
    expect(result.status).toEqual('graded');
    expect(result.graded_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.score).toEqual('number'); // Verify numeric conversion
  });

  it('should grade a submission without feedback', async () => {
    const input: GradeAssignmentSubmissionInput = {
      id: submissionId,
      score: 90.0
    };

    const result = await gradeAssignmentSubmission(input);

    expect(result.score).toEqual(90.0);
    expect(result.feedback).toBeNull();
    expect(result.status).toEqual('graded');
  });

  it('should handle zero score', async () => {
    const input: GradeAssignmentSubmissionInput = {
      id: submissionId,
      score: 0,
      feedback: 'Needs significant improvement'
    };

    const result = await gradeAssignmentSubmission(input);

    expect(result.score).toEqual(0);
    expect(result.feedback).toEqual('Needs significant improvement');
    expect(result.status).toEqual('graded');
  });

  it('should save graded submission to database', async () => {
    const input: GradeAssignmentSubmissionInput = {
      id: submissionId,
      score: 77.25,
      feedback: 'Meets expectations'
    };

    await gradeAssignmentSubmission(input);

    // Query database to verify changes
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, submissionId))
      .execute();

    expect(submissions).toHaveLength(1);
    const submission = submissions[0];
    expect(parseFloat(submission.score!)).toEqual(77.25);
    expect(submission.feedback).toEqual('Meets expectations');
    expect(submission.status).toEqual('graded');
    expect(submission.graded_at).toBeInstanceOf(Date);
    expect(submission.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent submission', async () => {
    const input: GradeAssignmentSubmissionInput = {
      id: 99999, // Non-existent ID
      score: 75.0,
      feedback: 'Good work'
    };

    await expect(gradeAssignmentSubmission(input)).rejects.toThrow(/not found/i);
  });

  it('should update previously graded submission', async () => {
    // First, grade the submission
    const firstGrade: GradeAssignmentSubmissionInput = {
      id: submissionId,
      score: 80.0,
      feedback: 'Initial feedback'
    };

    await gradeAssignmentSubmission(firstGrade);

    // Then, update the grade
    const updatedGrade: GradeAssignmentSubmissionInput = {
      id: submissionId,
      score: 90.0,
      feedback: 'Updated feedback after review'
    };

    const result = await gradeAssignmentSubmission(updatedGrade);

    expect(result.score).toEqual(90.0);
    expect(result.feedback).toEqual('Updated feedback after review');
    expect(result.status).toEqual('graded');
    
    // Verify in database
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, submissionId))
      .execute();

    expect(submissions).toHaveLength(1);
    expect(parseFloat(submissions[0].score!)).toEqual(90.0);
    expect(submissions[0].feedback).toEqual('Updated feedback after review');
  });

  it('should handle decimal scores correctly', async () => {
    const input: GradeAssignmentSubmissionInput = {
      id: submissionId,
      score: 87.33, // Use 2 decimal places to match numeric(5,2) precision
      feedback: 'Precise grading'
    };

    const result = await gradeAssignmentSubmission(input);

    expect(result.score).toEqual(87.33);
    expect(typeof result.score).toEqual('number');

    // Verify stored correctly in database
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, submissionId))
      .execute();

    expect(parseFloat(submissions[0].score!)).toEqual(87.33);
  });
});