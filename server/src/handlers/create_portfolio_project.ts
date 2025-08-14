import { db } from '../db';
import { portfolioProjectsTable, usersTable } from '../db/schema';
import { type CreatePortfolioProjectInput, type PortfolioProject } from '../schema';
import { eq } from 'drizzle-orm';

export const createPortfolioProject = async (input: CreatePortfolioProjectInput): Promise<PortfolioProject> => {
  try {
    // First, verify that the student exists and has the correct role
    const student = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.student_id))
      .execute();

    if (!student.length) {
      throw new Error('Student not found');
    }

    if (student[0].role !== 'student') {
      throw new Error('User must be a student to create portfolio projects');
    }

    if (!student[0].is_active) {
      throw new Error('Student account is not active');
    }

    // Insert the portfolio project
    const result = await db.insert(portfolioProjectsTable)
      .values({
        student_id: input.student_id,
        title: input.title,
        description: input.description || null,
        project_url: input.project_url || null,
        thumbnail_url: input.thumbnail_url || null,
        tags: input.tags || null,
        is_public: input.is_public ?? false
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Portfolio project creation failed:', error);
    throw error;
  }
};