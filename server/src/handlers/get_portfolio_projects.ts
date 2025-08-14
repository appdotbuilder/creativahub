import { db } from '../db';
import { portfolioProjectsTable } from '../db/schema';
import { type PortfolioProject, type GetStudentPortfolioInput } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getStudentPortfolio(input: GetStudentPortfolioInput): Promise<PortfolioProject[]> {
  try {
    // Fetch all portfolio projects for the specified student
    // ordered by creation date (newest first)
    const results = await db.select()
      .from(portfolioProjectsTable)
      .where(eq(portfolioProjectsTable.student_id, input.student_id))
      .orderBy(desc(portfolioProjectsTable.created_at))
      .execute();

    // Return projects as-is since all fields are already in correct format
    // (no numeric conversions needed for portfolio projects)
    return results;
  } catch (error) {
    console.error('Failed to fetch student portfolio:', error);
    throw error;
  }
}

export async function getPublicPortfolioProjects(): Promise<PortfolioProject[]> {
  try {
    // Fetch all public portfolio projects ordered by creation date (newest first)
    const results = await db.select()
      .from(portfolioProjectsTable)
      .where(eq(portfolioProjectsTable.is_public, true))
      .orderBy(desc(portfolioProjectsTable.created_at))
      .execute();

    // Return projects as-is since all fields are already in correct format
    return results;
  } catch (error) {
    console.error('Failed to fetch public portfolio projects:', error);
    throw error;
  }
}