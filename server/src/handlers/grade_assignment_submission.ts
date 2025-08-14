import { db } from '../db';
import { assignmentSubmissionsTable } from '../db/schema';
import { type GradeAssignmentSubmissionInput, type AssignmentSubmission } from '../schema';
import { eq } from 'drizzle-orm';

export const gradeAssignmentSubmission = async (input: GradeAssignmentSubmissionInput): Promise<AssignmentSubmission> => {
  try {
    // Update the submission with grade, feedback, status, and graded timestamp
    const result = await db.update(assignmentSubmissionsTable)
      .set({
        score: input.score.toString(), // Convert number to string for numeric column
        feedback: input.feedback || null,
        status: 'graded',
        graded_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(assignmentSubmissionsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Assignment submission with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const submission = result[0];
    return {
      ...submission,
      score: submission.score ? parseFloat(submission.score) : null
    };
  } catch (error) {
    console.error('Assignment submission grading failed:', error);
    throw error;
  }
};