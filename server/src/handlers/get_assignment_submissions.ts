import { db } from '../db';
import { assignmentSubmissionsTable, assignmentsTable, usersTable } from '../db/schema';
import { type AssignmentSubmission } from '../schema';
import { eq } from 'drizzle-orm';

export async function getAssignmentSubmissions(assignmentId: number): Promise<AssignmentSubmission[]> {
  try {
    // Fetch all submissions for a specific assignment
    const results = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, assignmentId))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(submission => ({
      ...submission,
      score: submission.score ? parseFloat(submission.score) : null
    }));
  } catch (error) {
    console.error('Failed to fetch assignment submissions:', error);
    throw error;
  }
}

export async function getStudentSubmissions(studentId: number): Promise<AssignmentSubmission[]> {
  try {
    // Fetch all submissions by a specific student across all courses
    const results = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.student_id, studentId))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(submission => ({
      ...submission,
      score: submission.score ? parseFloat(submission.score) : null
    }));
  } catch (error) {
    console.error('Failed to fetch student submissions:', error);
    throw error;
  }
}