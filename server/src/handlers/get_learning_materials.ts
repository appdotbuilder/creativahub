import { db } from '../db';
import { learningMaterialsTable } from '../db/schema';
import { type LearningMaterial } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getCourseLearningMaterials = async (courseId: number): Promise<LearningMaterial[]> => {
  try {
    // Fetch learning materials for the course ordered by order_index
    const results = await db.select()
      .from(learningMaterialsTable)
      .where(eq(learningMaterialsTable.course_id, courseId))
      .orderBy(asc(learningMaterialsTable.order_index))
      .execute();

    // Return the results (no numeric field conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to fetch learning materials:', error);
    throw error;
  }
};