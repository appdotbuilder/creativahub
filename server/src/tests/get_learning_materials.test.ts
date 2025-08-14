import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, learningMaterialsTable } from '../db/schema';
import { getCourseLearningMaterials } from '../handlers/get_learning_materials';

describe('getCourseLearningMaterials', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch learning materials ordered by order_index', async () => {
    // Create prerequisite teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const course = courseResult[0];

    // Create learning materials in non-sequential order
    await db.insert(learningMaterialsTable)
      .values([
        {
          course_id: course.id,
          title: 'Third Material',
          material_type: 'video',
          order_index: 3
        },
        {
          course_id: course.id,
          title: 'First Material',
          material_type: 'document',
          order_index: 1
        },
        {
          course_id: course.id,
          title: 'Second Material',
          material_type: 'quiz',
          order_index: 2
        }
      ])
      .execute();

    const results = await getCourseLearningMaterials(course.id);

    expect(results).toHaveLength(3);
    expect(results[0].title).toEqual('First Material');
    expect(results[0].order_index).toEqual(1);
    expect(results[1].title).toEqual('Second Material');
    expect(results[1].order_index).toEqual(2);
    expect(results[2].title).toEqual('Third Material');
    expect(results[2].order_index).toEqual(3);
  });

  it('should return empty array for course with no materials', async () => {
    // Create prerequisite teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create test course without materials
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Empty Course',
        description: 'A course with no materials',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const course = courseResult[0];

    const results = await getCourseLearningMaterials(course.id);

    expect(results).toHaveLength(0);
  });

  it('should return only materials for the specified course', async () => {
    // Create prerequisite teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create two test courses
    const courseResults = await db.insert(coursesTable)
      .values([
        {
          title: 'Course 1',
          teacher_id: teacher.id
        },
        {
          title: 'Course 2',
          teacher_id: teacher.id
        }
      ])
      .returning()
      .execute();

    const course1 = courseResults[0];
    const course2 = courseResults[1];

    // Create materials for both courses
    await db.insert(learningMaterialsTable)
      .values([
        {
          course_id: course1.id,
          title: 'Course 1 Material 1',
          material_type: 'video',
          order_index: 1
        },
        {
          course_id: course1.id,
          title: 'Course 1 Material 2',
          material_type: 'document',
          order_index: 2
        },
        {
          course_id: course2.id,
          title: 'Course 2 Material 1',
          material_type: 'quiz',
          order_index: 1
        }
      ])
      .execute();

    const results = await getCourseLearningMaterials(course1.id);

    expect(results).toHaveLength(2);
    expect(results[0].title).toEqual('Course 1 Material 1');
    expect(results[0].course_id).toEqual(course1.id);
    expect(results[1].title).toEqual('Course 1 Material 2');
    expect(results[1].course_id).toEqual(course1.id);
  });

  it('should include all learning material fields', async () => {
    // Create prerequisite teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const course = courseResult[0];

    // Create a complete learning material with all fields
    await db.insert(learningMaterialsTable)
      .values({
        course_id: course.id,
        title: 'Complete Material',
        description: 'A comprehensive material',
        content_url: 'https://example.com/content',
        file_url: 'https://example.com/file.pdf',
        material_type: 'document',
        order_index: 1
      })
      .execute();

    const results = await getCourseLearningMaterials(course.id);

    expect(results).toHaveLength(1);
    const material = results[0];
    
    // Verify all fields are present
    expect(material.id).toBeDefined();
    expect(material.course_id).toEqual(course.id);
    expect(material.title).toEqual('Complete Material');
    expect(material.description).toEqual('A comprehensive material');
    expect(material.content_url).toEqual('https://example.com/content');
    expect(material.file_url).toEqual('https://example.com/file.pdf');
    expect(material.material_type).toEqual('document');
    expect(material.order_index).toEqual(1);
    expect(material.created_at).toBeInstanceOf(Date);
    expect(material.updated_at).toBeInstanceOf(Date);
  });

  it('should return materials with null optional fields', async () => {
    // Create prerequisite teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const course = courseResult[0];

    // Create a minimal learning material with only required fields
    await db.insert(learningMaterialsTable)
      .values({
        course_id: course.id,
        title: 'Minimal Material',
        material_type: 'video',
        order_index: 1
      })
      .execute();

    const results = await getCourseLearningMaterials(course.id);

    expect(results).toHaveLength(1);
    const material = results[0];
    
    expect(material.title).toEqual('Minimal Material');
    expect(material.description).toBeNull();
    expect(material.content_url).toBeNull();
    expect(material.file_url).toBeNull();
    expect(material.material_type).toEqual('video');
    expect(material.order_index).toEqual(1);
  });
});