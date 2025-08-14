import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type CreateCourseInput, type Course } from '../schema';
import { eq } from 'drizzle-orm';

export const createCourse = async (input: CreateCourseInput): Promise<Course> => {
  try {
    // First, verify that the teacher exists and has the correct role
    const teacher = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.teacher_id))
      .execute();

    if (teacher.length === 0) {
      throw new Error('Teacher not found');
    }

    if (teacher[0].role !== 'teacher' && teacher[0].role !== 'admin') {
      throw new Error('Only teachers and admins can create courses');
    }

    if (!teacher[0].is_active) {
      throw new Error('Teacher account is not active');
    }

    // Insert course record
    const result = await db.insert(coursesTable)
      .values({
        title: input.title,
        description: input.description || null,
        teacher_id: input.teacher_id,
        thumbnail_url: input.thumbnail_url || null,
        status: input.status || 'draft'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Course creation failed:', error);
    throw error;
  }
};