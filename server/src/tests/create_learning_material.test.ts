import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { learningMaterialsTable, coursesTable, usersTable } from '../db/schema';
import { type CreateLearningMaterialInput } from '../schema';
import { createLearningMaterial } from '../handlers/create_learning_material';
import { eq } from 'drizzle-orm';

describe('createLearningMaterial', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test helper to create prerequisite data
  const createTestData = async () => {
    // Create a teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        role: 'teacher',
        is_active: true
      })
      .returning()
      .execute();

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherResult[0].id,
        status: 'published'
      })
      .returning()
      .execute();

    return {
      teacher: teacherResult[0],
      course: courseResult[0]
    };
  };

  it('should create a learning material successfully', async () => {
    const { course } = await createTestData();

    const testInput: CreateLearningMaterialInput = {
      course_id: course.id,
      title: 'Introduction to Programming',
      description: 'Basic programming concepts',
      content_url: 'https://example.com/content',
      file_url: 'https://example.com/file.pdf',
      material_type: 'document',
      order_index: 1
    };

    const result = await createLearningMaterial(testInput);

    // Verify returned data
    expect(result.id).toBeDefined();
    expect(result.course_id).toEqual(course.id);
    expect(result.title).toEqual('Introduction to Programming');
    expect(result.description).toEqual('Basic programming concepts');
    expect(result.content_url).toEqual('https://example.com/content');
    expect(result.file_url).toEqual('https://example.com/file.pdf');
    expect(result.material_type).toEqual('document');
    expect(result.order_index).toEqual(1);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save learning material to database', async () => {
    const { course } = await createTestData();

    const testInput: CreateLearningMaterialInput = {
      course_id: course.id,
      title: 'Video Lecture',
      description: 'Programming fundamentals video',
      content_url: 'https://example.com/video',
      file_url: null,
      material_type: 'video',
      order_index: 2
    };

    const result = await createLearningMaterial(testInput);

    // Query database to verify material was saved
    const materials = await db.select()
      .from(learningMaterialsTable)
      .where(eq(learningMaterialsTable.id, result.id))
      .execute();

    expect(materials).toHaveLength(1);
    expect(materials[0].title).toEqual('Video Lecture');
    expect(materials[0].description).toEqual('Programming fundamentals video');
    expect(materials[0].content_url).toEqual('https://example.com/video');
    expect(materials[0].file_url).toBeNull();
    expect(materials[0].material_type).toEqual('video');
    expect(materials[0].order_index).toEqual(2);
  });

  it('should handle optional fields correctly', async () => {
    const { course } = await createTestData();

    const testInput: CreateLearningMaterialInput = {
      course_id: course.id,
      title: 'Assignment Instructions',
      material_type: 'text',
      order_index: 3
    };

    const result = await createLearningMaterial(testInput);

    expect(result.description).toBeNull();
    expect(result.content_url).toBeNull();
    expect(result.file_url).toBeNull();
    expect(result.title).toEqual('Assignment Instructions');
    expect(result.material_type).toEqual('text');
    expect(result.order_index).toEqual(3);
  });

  it('should throw error when course does not exist', async () => {
    const testInput: CreateLearningMaterialInput = {
      course_id: 99999, // Non-existent course ID
      title: 'Test Material',
      material_type: 'document',
      order_index: 1
    };

    await expect(createLearningMaterial(testInput)).rejects.toThrow(/course not found/i);
  });

  it('should handle different material types', async () => {
    const { course } = await createTestData();

    const materialTypes = ['document', 'video', 'audio', 'interactive', 'text'];

    for (let i = 0; i < materialTypes.length; i++) {
      const testInput: CreateLearningMaterialInput = {
        course_id: course.id,
        title: `${materialTypes[i]} Material`,
        material_type: materialTypes[i],
        order_index: i + 1
      };

      const result = await createLearningMaterial(testInput);
      expect(result.material_type).toEqual(materialTypes[i]);
      expect(result.order_index).toEqual(i + 1);
    }

    // Verify all materials were created
    const allMaterials = await db.select()
      .from(learningMaterialsTable)
      .where(eq(learningMaterialsTable.course_id, course.id))
      .execute();

    expect(allMaterials).toHaveLength(materialTypes.length);
  });

  it('should maintain proper order_index values', async () => {
    const { course } = await createTestData();

    // Create materials with different order indices
    const materials = [
      { title: 'First Material', order_index: 1 },
      { title: 'Third Material', order_index: 3 },
      { title: 'Second Material', order_index: 2 }
    ];

    const createdMaterials = [];
    for (const material of materials) {
      const testInput: CreateLearningMaterialInput = {
        course_id: course.id,
        title: material.title,
        material_type: 'document',
        order_index: material.order_index
      };

      const result = await createLearningMaterial(testInput);
      createdMaterials.push(result);
    }

    // Verify each material has the correct order index
    expect(createdMaterials[0].order_index).toEqual(1);
    expect(createdMaterials[1].order_index).toEqual(3);
    expect(createdMaterials[2].order_index).toEqual(2);
  });

  it('should handle empty string values for optional fields', async () => {
    const { course } = await createTestData();

    const testInput: CreateLearningMaterialInput = {
      course_id: course.id,
      title: 'Test Material',
      description: '',
      content_url: '',
      file_url: '',
      material_type: 'document',
      order_index: 1
    };

    const result = await createLearningMaterial(testInput);

    // Empty strings should be preserved as empty strings
    expect(result.description).toEqual('');
    expect(result.content_url).toEqual('');
    expect(result.file_url).toEqual('');
  });
});