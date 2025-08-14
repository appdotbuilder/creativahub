import { db } from '../db';
import { coursesTable, courseEnrollmentsTable } from '../db/schema';
import { type Course, type GetUserCoursesInput, type GetCourseDetailsInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getCourses(): Promise<Course[]> {
  try {
    // Fetch all published courses available for enrollment
    const results = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.status, 'published'))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(course => ({
      ...course,
      // No numeric fields to convert in courses table
    }));
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    throw error;
  }
}

export async function getUserCourses(input: GetUserCoursesInput): Promise<Course[]> {
  try {
    if (input.role === 'student') {
      // Students: enrolled courses
      const results = await db.select()
        .from(coursesTable)
        .innerJoin(
          courseEnrollmentsTable,
          eq(coursesTable.id, courseEnrollmentsTable.course_id)
        )
        .where(eq(courseEnrollmentsTable.student_id, input.user_id))
        .execute();
      
      return results.map(result => ({
        ...(result as any).courses,
        // No numeric fields to convert in courses table
      }));
    } else if (input.role === 'teacher') {
      // Teachers: courses they teach
      const results = await db.select()
        .from(coursesTable)
        .where(eq(coursesTable.teacher_id, input.user_id))
        .execute();
      
      return results.map(course => ({
        ...course,
        // No numeric fields to convert in courses table
      }));
    } else if (input.role === 'admin') {
      // Admins: all courses
      const results = await db.select()
        .from(coursesTable)
        .execute();
      
      return results.map(course => ({
        ...course,
        // No numeric fields to convert in courses table
      }));
    }

    return [];
  } catch (error) {
    console.error('Failed to fetch user courses:', error);
    throw error;
  }
}

export async function getCourseDetails(input: GetCourseDetailsInput): Promise<Course | null> {
  try {
    // Fetch detailed course information
    const results = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const course = results[0];
    return {
      ...course,
      // No numeric fields to convert in courses table
    };
  } catch (error) {
    console.error('Failed to fetch course details:', error);
    throw error;
  }
}