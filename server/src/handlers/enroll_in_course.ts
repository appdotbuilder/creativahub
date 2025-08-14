import { db } from '../db';
import { usersTable, coursesTable, courseEnrollmentsTable } from '../db/schema';
import { type EnrollInCourseInput, type CourseEnrollment } from '../schema';
import { eq, and } from 'drizzle-orm';

export const enrollInCourse = async (input: EnrollInCourseInput): Promise<CourseEnrollment> => {
  try {
    // First, validate that the student exists and has the 'student' role
    const student = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.student_id))
      .execute();

    if (student.length === 0) {
      throw new Error('Student not found');
    }

    if (student[0].role !== 'student') {
      throw new Error('User is not a student');
    }

    if (!student[0].is_active) {
      throw new Error('Student account is inactive');
    }

    // Validate that the course exists and is published
    const course = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();

    if (course.length === 0) {
      throw new Error('Course not found');
    }

    if (course[0].status !== 'published') {
      throw new Error('Course is not available for enrollment');
    }

    // Check if the student is already enrolled in this course
    const existingEnrollment = await db.select()
      .from(courseEnrollmentsTable)
      .where(and(
        eq(courseEnrollmentsTable.course_id, input.course_id),
        eq(courseEnrollmentsTable.student_id, input.student_id)
      ))
      .execute();

    if (existingEnrollment.length > 0) {
      throw new Error('Student is already enrolled in this course');
    }

    // Create the enrollment
    const result = await db.insert(courseEnrollmentsTable)
      .values({
        course_id: input.course_id,
        student_id: input.student_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Course enrollment failed:', error);
    throw error;
  }
};