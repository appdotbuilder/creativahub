import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'testpassword123',
  full_name: 'Test User',
  role: 'student',
  avatar_url: 'https://example.com/avatar.jpg'
};

// Test input without optional fields
const minimalInput: CreateUserInput = {
  email: 'minimal@example.com',
  password: 'password123',
  full_name: 'Minimal User',
  role: 'teacher'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.role).toEqual('student');
    expect(result.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Password should be hashed, not plain text
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('testpassword123');
    expect(result.password_hash.length).toBeGreaterThan(20); // Hashed passwords are long
  });

  it('should create a user without optional fields', async () => {
    const result = await createUser(minimalInput);

    expect(result.email).toEqual('minimal@example.com');
    expect(result.full_name).toEqual('Minimal User');
    expect(result.role).toEqual('teacher');
    expect(result.avatar_url).toBeNull();
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query the database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].role).toEqual('student');
    expect(users[0].avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(users[0].is_active).toBe(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should hash password properly', async () => {
    const result = await createUser(testInput);

    // Password should be hashed using Bun's password hashing
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual(testInput.password);
    
    // Verify password can be verified with Bun's password verification
    const isValid = await Bun.password.verify(testInput.password, result.password_hash);
    expect(isValid).toBe(true);
    
    // Wrong password should not verify
    const isInvalid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should create users with different roles', async () => {
    // Create student
    const studentInput: CreateUserInput = {
      email: 'student@example.com',
      password: 'password123',
      full_name: 'Student User',
      role: 'student'
    };
    const student = await createUser(studentInput);
    expect(student.role).toEqual('student');

    // Create teacher
    const teacherInput: CreateUserInput = {
      email: 'teacher@example.com',
      password: 'password123',
      full_name: 'Teacher User',
      role: 'teacher'
    };
    const teacher = await createUser(teacherInput);
    expect(teacher.role).toEqual('teacher');

    // Create admin
    const adminInput: CreateUserInput = {
      email: 'admin@example.com',
      password: 'password123',
      full_name: 'Admin User',
      role: 'admin'
    };
    const admin = await createUser(adminInput);
    expect(admin.role).toEqual('admin');
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create user with same email
    const duplicateInput: CreateUserInput = {
      email: 'test@example.com', // Same email
      password: 'differentpassword',
      full_name: 'Different User',
      role: 'teacher'
    };

    // Should throw error due to unique constraint
    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should handle null avatar_url correctly', async () => {
    const inputWithNullAvatar: CreateUserInput = {
      email: 'null-avatar@example.com',
      password: 'password123',
      full_name: 'Null Avatar User',
      role: 'student',
      avatar_url: null
    };

    const result = await createUser(inputWithNullAvatar);
    expect(result.avatar_url).toBeNull();
  });

  it('should set default is_active to true', async () => {
    const result = await createUser(minimalInput);
    expect(result.is_active).toBe(true);

    // Verify in database as well
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].is_active).toBe(true);
  });
});