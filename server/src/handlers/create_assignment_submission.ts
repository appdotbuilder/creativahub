import { db } from '../db';
import { assignmentSubmissionsTable, assignmentsTable, courseEnrollmentsTable } from '../db/schema';
import { type CreateAssignmentSubmissionInput, type AssignmentSubmission } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createAssignmentSubmission = async (input: CreateAssignmentSubmissionInput): Promise<AssignmentSubmission> => {
  try {
    // Validate that the assignment exists and is published
    const assignmentQuery = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, input.assignment_id))
      .execute();

    if (assignmentQuery.length === 0) {
      throw new Error('Assignment not found');
    }

    const assignment = assignmentQuery[0];
    if (assignment.status !== 'published') {
      throw new Error('Assignment is not published');
    }

    // Validate that the student is enrolled in the course
    const enrollmentQuery = await db.select()
      .from(courseEnrollmentsTable)
      .where(and(
        eq(courseEnrollmentsTable.course_id, assignment.course_id),
        eq(courseEnrollmentsTable.student_id, input.student_id)
      ))
      .execute();

    if (enrollmentQuery.length === 0) {
      throw new Error('Student is not enrolled in the course');
    }

    // Check if submission already exists
    const existingSubmissionQuery = await db.select()
      .from(assignmentSubmissionsTable)
      .where(and(
        eq(assignmentSubmissionsTable.assignment_id, input.assignment_id),
        eq(assignmentSubmissionsTable.student_id, input.student_id)
      ))
      .execute();

    if (existingSubmissionQuery.length > 0) {
      throw new Error('Submission already exists for this assignment');
    }

    // Insert the submission
    const result = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: input.assignment_id,
        student_id: input.student_id,
        submission_url: input.submission_url || null,
        submission_text: input.submission_text || null,
        status: 'draft'
      })
      .returning()
      .execute();

    const submission = result[0];
    return {
      ...submission,
      score: submission.score ? parseFloat(submission.score) : null
    };
  } catch (error) {
    console.error('Assignment submission creation failed:', error);
    throw error;
  }
};