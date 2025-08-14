import { db } from '../db';
import { assignmentsTable, coursesTable } from '../db/schema';
import { type CreateAssignmentInput, type Assignment } from '../schema';
import { eq } from 'drizzle-orm';

export const createAssignment = async (input: CreateAssignmentInput): Promise<Assignment> => {
  try {
    // Verify that the course exists
    const courseExists = await db.select({ id: coursesTable.id })
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();

    if (courseExists.length === 0) {
      throw new Error('Course not found');
    }

    // Insert assignment record
    const result = await db.insert(assignmentsTable)
      .values({
        course_id: input.course_id,
        title: input.title,
        description: input.description,
        due_date: input.due_date,
        max_score: input.max_score.toString(), // Convert number to string for numeric column
        status: input.status || 'draft'
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const assignment = result[0];
    return {
      ...assignment,
      max_score: parseFloat(assignment.max_score) // Convert string back to number
    };
  } catch (error) {
    console.error('Assignment creation failed:', error);
    throw error;
  }
};