import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable } from '../db/schema';
import { type UpdateCourseInput } from '../schema';
import { updateCourse } from '../handlers/update_course';
import { eq } from 'drizzle-orm';

describe('updateCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;
  let courseId: number;

  beforeEach(async () => {
    // Create a test teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    teacherId = teacherResult[0].id;

    // Create a test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Original Course Title',
        description: 'Original description',
        teacher_id: teacherId,
        thumbnail_url: 'original-thumbnail.jpg',
        status: 'draft'
      })
      .returning()
      .execute();

    courseId = courseResult[0].id;
  });

  it('should update course title', async () => {
    const input: UpdateCourseInput = {
      id: courseId,
      title: 'Updated Course Title'
    };

    const result = await updateCourse(input);

    expect(result.id).toEqual(courseId);
    expect(result.title).toEqual('Updated Course Title');
    expect(result.description).toEqual('Original description');
    expect(result.teacher_id).toEqual(teacherId);
    expect(result.thumbnail_url).toEqual('original-thumbnail.jpg');
    expect(result.status).toEqual('draft');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update course description', async () => {
    const input: UpdateCourseInput = {
      id: courseId,
      description: 'Updated description'
    };

    const result = await updateCourse(input);

    expect(result.title).toEqual('Original Course Title');
    expect(result.description).toEqual('Updated description');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update course thumbnail', async () => {
    const input: UpdateCourseInput = {
      id: courseId,
      thumbnail_url: 'updated-thumbnail.jpg'
    };

    const result = await updateCourse(input);

    expect(result.thumbnail_url).toEqual('updated-thumbnail.jpg');
    expect(result.title).toEqual('Original Course Title');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update course status', async () => {
    const input: UpdateCourseInput = {
      id: courseId,
      status: 'published'
    };

    const result = await updateCourse(input);

    expect(result.status).toEqual('published');
    expect(result.title).toEqual('Original Course Title');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateCourseInput = {
      id: courseId,
      title: 'New Title',
      description: 'New description',
      thumbnail_url: 'new-thumbnail.jpg',
      status: 'published'
    };

    const result = await updateCourse(input);

    expect(result.title).toEqual('New Title');
    expect(result.description).toEqual('New description');
    expect(result.thumbnail_url).toEqual('new-thumbnail.jpg');
    expect(result.status).toEqual('published');
    expect(result.teacher_id).toEqual(teacherId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null values for optional fields', async () => {
    const input: UpdateCourseInput = {
      id: courseId,
      description: null,
      thumbnail_url: null
    };

    const result = await updateCourse(input);

    expect(result.description).toBeNull();
    expect(result.thumbnail_url).toBeNull();
    expect(result.title).toEqual('Original Course Title');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const input: UpdateCourseInput = {
      id: courseId,
      title: 'Database Updated Title',
      status: 'published'
    };

    await updateCourse(input);

    // Verify changes were saved to database
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].title).toEqual('Database Updated Title');
    expect(courses[0].status).toEqual('published');
    expect(courses[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    // Get original timestamp
    const originalCourse = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();

    const originalUpdatedAt = originalCourse[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateCourseInput = {
      id: courseId,
      title: 'Updated Title'
    };

    const result = await updateCourse(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent course', async () => {
    const input: UpdateCourseInput = {
      id: 99999,
      title: 'Non-existent Course'
    };

    await expect(updateCourse(input)).rejects.toThrow(/Course with id 99999 not found/);
  });

  it('should preserve unchanged fields', async () => {
    // Only update title
    const input: UpdateCourseInput = {
      id: courseId,
      title: 'Only Title Changed'
    };

    const result = await updateCourse(input);

    // All other fields should remain unchanged
    expect(result.title).toEqual('Only Title Changed');
    expect(result.description).toEqual('Original description');
    expect(result.teacher_id).toEqual(teacherId);
    expect(result.thumbnail_url).toEqual('original-thumbnail.jpg');
    expect(result.status).toEqual('draft');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should handle course status transitions correctly', async () => {
    // Test status transition from draft to published
    const publishInput: UpdateCourseInput = {
      id: courseId,
      status: 'published'
    };

    const publishedResult = await updateCourse(publishInput);
    expect(publishedResult.status).toEqual('published');

    // Test status transition from published to archived
    const archiveInput: UpdateCourseInput = {
      id: courseId,
      status: 'archived'
    };

    const archivedResult = await updateCourse(archiveInput);
    expect(archivedResult.status).toEqual('archived');
  });
});