import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, courseEnrollmentsTable } from '../db/schema';
import { type EnrollInCourseInput } from '../schema';
import { enrollInCourse } from '../handlers/enroll_in_course';
import { eq, and } from 'drizzle-orm';

describe('enrollInCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;
  let studentId: number;
  let inactiveStudentId: number;
  let courseId: number;
  let draftCourseId: number;

  beforeEach(async () => {
    // Create test teacher
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    teacherId = teacher[0].id;

    // Create test student
    const student = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();
    studentId = student[0].id;

    // Create inactive student
    const inactiveStudent = await db.insert(usersTable)
      .values({
        email: 'inactive@test.com',
        password_hash: 'hashed_password',
        full_name: 'Inactive Student',
        role: 'student',
        is_active: false
      })
      .returning()
      .execute();
    inactiveStudentId = inactiveStudent[0].id;

    // Create published course
    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherId,
        status: 'published'
      })
      .returning()
      .execute();
    courseId = course[0].id;

    // Create draft course
    const draftCourse = await db.insert(coursesTable)
      .values({
        title: 'Draft Course',
        description: 'A draft course',
        teacher_id: teacherId,
        status: 'draft'
      })
      .returning()
      .execute();
    draftCourseId = draftCourse[0].id;
  });

  it('should successfully enroll a student in a published course', async () => {
    const input: EnrollInCourseInput = {
      course_id: courseId,
      student_id: studentId
    };

    const result = await enrollInCourse(input);

    // Verify the enrollment was created
    expect(result.id).toBeDefined();
    expect(result.course_id).toEqual(courseId);
    expect(result.student_id).toEqual(studentId);
    expect(result.enrolled_at).toBeInstanceOf(Date);

    // Verify enrollment exists in database
    const enrollments = await db.select()
      .from(courseEnrollmentsTable)
      .where(eq(courseEnrollmentsTable.id, result.id))
      .execute();

    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].course_id).toEqual(courseId);
    expect(enrollments[0].student_id).toEqual(studentId);
  });

  it('should throw error when student does not exist', async () => {
    const input: EnrollInCourseInput = {
      course_id: courseId,
      student_id: 99999 // Non-existent student ID
    };

    await expect(enrollInCourse(input)).rejects.toThrow(/student not found/i);
  });

  it('should throw error when user is not a student', async () => {
    const input: EnrollInCourseInput = {
      course_id: courseId,
      student_id: teacherId // Teacher ID instead of student
    };

    await expect(enrollInCourse(input)).rejects.toThrow(/user is not a student/i);
  });

  it('should throw error when student account is inactive', async () => {
    const input: EnrollInCourseInput = {
      course_id: courseId,
      student_id: inactiveStudentId
    };

    await expect(enrollInCourse(input)).rejects.toThrow(/student account is inactive/i);
  });

  it('should throw error when course does not exist', async () => {
    const input: EnrollInCourseInput = {
      course_id: 99999, // Non-existent course ID
      student_id: studentId
    };

    await expect(enrollInCourse(input)).rejects.toThrow(/course not found/i);
  });

  it('should throw error when course is not published', async () => {
    const input: EnrollInCourseInput = {
      course_id: draftCourseId,
      student_id: studentId
    };

    await expect(enrollInCourse(input)).rejects.toThrow(/course is not available for enrollment/i);
  });

  it('should throw error when student is already enrolled', async () => {
    // First enrollment
    const input: EnrollInCourseInput = {
      course_id: courseId,
      student_id: studentId
    };

    await enrollInCourse(input);

    // Try to enroll again
    await expect(enrollInCourse(input)).rejects.toThrow(/student is already enrolled in this course/i);
  });

  it('should allow enrollment after verifying no duplicate exists', async () => {
    const input: EnrollInCourseInput = {
      course_id: courseId,
      student_id: studentId
    };

    // Verify no existing enrollment
    const existingEnrollments = await db.select()
      .from(courseEnrollmentsTable)
      .where(and(
        eq(courseEnrollmentsTable.course_id, courseId),
        eq(courseEnrollmentsTable.student_id, studentId)
      ))
      .execute();

    expect(existingEnrollments).toHaveLength(0);

    // Now enroll
    const result = await enrollInCourse(input);

    expect(result.course_id).toEqual(courseId);
    expect(result.student_id).toEqual(studentId);

    // Verify the enrollment now exists
    const newEnrollments = await db.select()
      .from(courseEnrollmentsTable)
      .where(and(
        eq(courseEnrollmentsTable.course_id, courseId),
        eq(courseEnrollmentsTable.student_id, studentId)
      ))
      .execute();

    expect(newEnrollments).toHaveLength(1);
  });

  it('should handle archived course enrollment correctly', async () => {
    // Create archived course
    const archivedCourse = await db.insert(coursesTable)
      .values({
        title: 'Archived Course',
        description: 'An archived course',
        teacher_id: teacherId,
        status: 'archived'
      })
      .returning()
      .execute();

    const input: EnrollInCourseInput = {
      course_id: archivedCourse[0].id,
      student_id: studentId
    };

    await expect(enrollInCourse(input)).rejects.toThrow(/course is not available for enrollment/i);
  });
});