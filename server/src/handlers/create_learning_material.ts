import { db } from '../db';
import { learningMaterialsTable, coursesTable } from '../db/schema';
import { type CreateLearningMaterialInput, type LearningMaterial } from '../schema';
import { eq } from 'drizzle-orm';

export const createLearningMaterial = async (input: CreateLearningMaterialInput): Promise<LearningMaterial> => {
  try {
    // Verify that the course exists
    const course = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();

    if (course.length === 0) {
      throw new Error('Course not found');
    }

    // Insert learning material record
    const result = await db.insert(learningMaterialsTable)
      .values({
        course_id: input.course_id,
        title: input.title,
        description: input.description !== undefined ? input.description : null,
        content_url: input.content_url !== undefined ? input.content_url : null,
        file_url: input.file_url !== undefined ? input.file_url : null,
        material_type: input.material_type,
        order_index: input.order_index
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Learning material creation failed:', error);
    throw error;
  }
};