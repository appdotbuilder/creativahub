import { db } from '../db';
import { assignmentsTable } from '../db/schema';
import { type Assignment } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCourseAssignments(courseId: number): Promise<Assignment[]> {
  try {
    // Fetch all assignments for the specified course
    const results = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.course_id, courseId))
      .execute();

    // Convert numeric fields from strings to numbers
    return results.map(assignment => ({
      ...assignment,
      max_score: parseFloat(assignment.max_score) // Convert string to number
    }));
  } catch (error) {
    console.error('Failed to fetch course assignments:', error);
    throw error;
  }
}