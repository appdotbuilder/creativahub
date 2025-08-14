import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, courseEnrollmentsTable } from '../db/schema';
import { type GetUserCoursesInput, type GetCourseDetailsInput } from '../schema';
import { getCourses, getUserCourses, getCourseDetails } from '../handlers/get_courses';
import { eq } from 'drizzle-orm';

describe('getCourses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return only published courses', async () => {
    // Create a teacher user first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create courses with different statuses
    await db.insert(coursesTable)
      .values([
        {
          title: 'Published Course 1',
          description: 'A published course',
          teacher_id: teacherId,
          status: 'published'
        },
        {
          title: 'Draft Course',
          description: 'A draft course',
          teacher_id: teacherId,
          status: 'draft'
        },
        {
          title: 'Published Course 2',
          description: 'Another published course',
          teacher_id: teacherId,
          status: 'published'
        },
        {
          title: 'Archived Course',
          description: 'An archived course',
          teacher_id: teacherId,
          status: 'archived'
        }
      ])
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(2);
    expect(result.every(course => course.status === 'published')).toBe(true);
    expect(result.map(course => course.title)).toContain('Published Course 1');
    expect(result.map(course => course.title)).toContain('Published Course 2');
  });

  it('should return empty array when no published courses exist', async () => {
    // Create a teacher user first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create only draft courses
    await db.insert(coursesTable)
      .values([
        {
          title: 'Draft Course 1',
          description: 'A draft course',
          teacher_id: teacherId,
          status: 'draft'
        },
        {
          title: 'Draft Course 2',
          description: 'Another draft course',
          teacher_id: teacherId,
          status: 'draft'
        }
      ])
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(0);
  });

  it('should return courses with all required fields', async () => {
    // Create a teacher user first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create a published course
    await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacherId,
        thumbnail_url: 'http://example.com/thumb.jpg',
        status: 'published'
      })
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(1);
    const course = result[0];
    expect(course.id).toBeDefined();
    expect(course.title).toBe('Test Course');
    expect(course.description).toBe('A test course');
    expect(course.teacher_id).toBe(teacherId);
    expect(course.thumbnail_url).toBe('http://example.com/thumb.jpg');
    expect(course.status).toBe('published');
    expect(course.created_at).toBeInstanceOf(Date);
    expect(course.updated_at).toBeInstanceOf(Date);
  });
});

describe('getUserCourses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return enrolled courses for students', async () => {
    // Create users
    const [studentResult, teacherResult] = await Promise.all([
      db.insert(usersTable)
        .values({
          email: 'student@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Test Student',
          role: 'student'
        })
        .returning()
        .execute(),
      db.insert(usersTable)
        .values({
          email: 'teacher@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Test Teacher',
          role: 'teacher'
        })
        .returning()
        .execute()
    ]);

    const studentId = studentResult[0].id;
    const teacherId = teacherResult[0].id;

    // Create courses
    const courseResults = await db.insert(coursesTable)
      .values([
        {
          title: 'Enrolled Course',
          description: 'Course student is enrolled in',
          teacher_id: teacherId,
          status: 'published'
        },
        {
          title: 'Not Enrolled Course',
          description: 'Course student is not enrolled in',
          teacher_id: teacherId,
          status: 'published'
        }
      ])
      .returning()
      .execute();

    // Enroll student in first course
    await db.insert(courseEnrollmentsTable)
      .values({
        course_id: courseResults[0].id,
        student_id: studentId
      })
      .execute();

    const input: GetUserCoursesInput = {
      user_id: studentId,
      role: 'student'
    };

    const result = await getUserCourses(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Enrolled Course');
    expect(result[0].id).toBe(courseResults[0].id);
  });

  it('should return taught courses for teachers', async () => {
    // Create users
    const [teacherResult, otherTeacherResult] = await Promise.all([
      db.insert(usersTable)
        .values({
          email: 'teacher@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Test Teacher',
          role: 'teacher'
        })
        .returning()
        .execute(),
      db.insert(usersTable)
        .values({
          email: 'other@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Other Teacher',
          role: 'teacher'
        })
        .returning()
        .execute()
    ]);

    const teacherId = teacherResult[0].id;
    const otherTeacherId = otherTeacherResult[0].id;

    // Create courses
    await db.insert(coursesTable)
      .values([
        {
          title: 'My Course 1',
          description: 'Course taught by teacher',
          teacher_id: teacherId,
          status: 'published'
        },
        {
          title: 'My Course 2',
          description: 'Another course taught by teacher',
          teacher_id: teacherId,
          status: 'draft'
        },
        {
          title: 'Other Course',
          description: 'Course taught by other teacher',
          teacher_id: otherTeacherId,
          status: 'published'
        }
      ])
      .execute();

    const input: GetUserCoursesInput = {
      user_id: teacherId,
      role: 'teacher'
    };

    const result = await getUserCourses(input);

    expect(result).toHaveLength(2);
    expect(result.map(course => course.title)).toContain('My Course 1');
    expect(result.map(course => course.title)).toContain('My Course 2');
    expect(result.every(course => course.teacher_id === teacherId)).toBe(true);
  });

  it('should return all courses for admins', async () => {
    // Create users
    const [adminResult, teacherResult] = await Promise.all([
      db.insert(usersTable)
        .values({
          email: 'admin@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Test Admin',
          role: 'admin'
        })
        .returning()
        .execute(),
      db.insert(usersTable)
        .values({
          email: 'teacher@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Test Teacher',
          role: 'teacher'
        })
        .returning()
        .execute()
    ]);

    const adminId = adminResult[0].id;
    const teacherId = teacherResult[0].id;

    // Create courses with different statuses
    await db.insert(coursesTable)
      .values([
        {
          title: 'Published Course',
          description: 'A published course',
          teacher_id: teacherId,
          status: 'published'
        },
        {
          title: 'Draft Course',
          description: 'A draft course',
          teacher_id: teacherId,
          status: 'draft'
        },
        {
          title: 'Archived Course',
          description: 'An archived course',
          teacher_id: teacherId,
          status: 'archived'
        }
      ])
      .execute();

    const input: GetUserCoursesInput = {
      user_id: adminId,
      role: 'admin'
    };

    const result = await getUserCourses(input);

    expect(result).toHaveLength(3);
    expect(result.map(course => course.title)).toContain('Published Course');
    expect(result.map(course => course.title)).toContain('Draft Course');
    expect(result.map(course => course.title)).toContain('Archived Course');
  });

  it('should return empty array for student with no enrollments', async () => {
    // Create student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const studentId = studentResult[0].id;

    // Create teacher and course but don't enroll student
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    await db.insert(coursesTable)
      .values({
        title: 'Unenrolled Course',
        description: 'Course student is not enrolled in',
        teacher_id: teacherId,
        status: 'published'
      })
      .execute();

    const input: GetUserCoursesInput = {
      user_id: studentId,
      role: 'student'
    };

    const result = await getUserCourses(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for invalid role', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'student'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const input = {
      user_id: userId,
      role: 'invalid_role' as any
    };

    const result = await getUserCourses(input);

    expect(result).toHaveLength(0);
  });
});

describe('getCourseDetails', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return course details when course exists', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A detailed test course',
        teacher_id: teacherId,
        thumbnail_url: 'http://example.com/thumb.jpg',
        status: 'published'
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    const input: GetCourseDetailsInput = {
      course_id: courseId
    };

    const result = await getCourseDetails(input);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(courseId);
    expect(result!.title).toBe('Test Course');
    expect(result!.description).toBe('A detailed test course');
    expect(result!.teacher_id).toBe(teacherId);
    expect(result!.thumbnail_url).toBe('http://example.com/thumb.jpg');
    expect(result!.status).toBe('published');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when course does not exist', async () => {
    const input: GetCourseDetailsInput = {
      course_id: 999999
    };

    const result = await getCourseDetails(input);

    expect(result).toBeNull();
  });

  it('should return course with all fields including nullable ones', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create course with nullable fields as null
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Minimal Course',
        description: null,
        teacher_id: teacherId,
        thumbnail_url: null,
        status: 'draft'
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    const input: GetCourseDetailsInput = {
      course_id: courseId
    };

    const result = await getCourseDetails(input);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(courseId);
    expect(result!.title).toBe('Minimal Course');
    expect(result!.description).toBeNull();
    expect(result!.teacher_id).toBe(teacherId);
    expect(result!.thumbnail_url).toBeNull();
    expect(result!.status).toBe('draft');
  });

  it('should verify course exists in database after fetching details', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Verification Course',
        description: 'Course for verification test',
        teacher_id: teacherId,
        status: 'published'
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    const input: GetCourseDetailsInput = {
      course_id: courseId
    };

    const result = await getCourseDetails(input);

    // Verify the course exists in the database
    const dbCourses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();

    expect(dbCourses).toHaveLength(1);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(dbCourses[0].id);
    expect(result!.title).toBe(dbCourses[0].title);
  });
});