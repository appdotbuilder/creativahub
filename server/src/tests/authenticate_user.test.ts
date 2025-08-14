import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { authenticateUser } from '../handlers/authenticate_user';
import { createHash } from 'crypto';

// Helper function to create a password hash
const hashPassword = (password: string): string => {
  return createHash('sha256').update(password).digest('hex');
};

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: hashPassword('password123'),
  full_name: 'Test User',
  role: 'student' as const,
  avatar_url: null,
  is_active: true
};

const inactiveUser = {
  email: 'inactive@example.com',
  password_hash: hashPassword('password456'),
  full_name: 'Inactive User',
  role: 'teacher' as const,
  avatar_url: 'https://example.com/avatar.jpg',
  is_active: false
};

describe('authenticateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with correct credentials', async () => {
    // Insert test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeDefined();
    expect(result!.email).toEqual('test@example.com');
    expect(result!.full_name).toEqual('Test User');
    expect(result!.role).toEqual('student');
    expect(result!.is_active).toBe(true);
    expect(result!.avatar_url).toBeNull();
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for incorrect password', async () => {
    // Insert test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });

  it('should return null for non-existent email', async () => {
    const loginInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });

  it('should return null for inactive user', async () => {
    // Insert inactive user
    await db.insert(usersTable)
      .values(inactiveUser)
      .execute();

    const loginInput: LoginInput = {
      email: 'inactive@example.com',
      password: 'password456'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });

  it('should authenticate user with avatar_url', async () => {
    const userWithAvatar = {
      ...testUser,
      email: 'avatar@example.com',
      avatar_url: 'https://example.com/profile.jpg'
    };

    await db.insert(usersTable)
      .values(userWithAvatar)
      .execute();

    const loginInput: LoginInput = {
      email: 'avatar@example.com',
      password: 'password123'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeDefined();
    expect(result!.avatar_url).toEqual('https://example.com/profile.jpg');
    expect(result!.email).toEqual('avatar@example.com');
  });

  it('should authenticate admin user', async () => {
    const adminUser = {
      ...testUser,
      email: 'admin@example.com',
      role: 'admin' as const,
      full_name: 'Admin User'
    };

    await db.insert(usersTable)
      .values(adminUser)
      .execute();

    const loginInput: LoginInput = {
      email: 'admin@example.com',
      password: 'password123'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeDefined();
    expect(result!.role).toEqual('admin');
    expect(result!.full_name).toEqual('Admin User');
  });

  it('should handle case-sensitive email matching', async () => {
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const loginInput: LoginInput = {
      email: 'TEST@EXAMPLE.COM',
      password: 'password123'
    };

    const result = await authenticateUser(loginInput);

    // Should return null for case-sensitive email mismatch
    expect(result).toBeNull();
  });

  it('should authenticate teacher user', async () => {
    const teacherUser = {
      email: 'teacher@example.com',
      password_hash: hashPassword('teacherpass'),
      full_name: 'Teacher User',
      role: 'teacher' as const,
      avatar_url: null,
      is_active: true
    };

    await db.insert(usersTable)
      .values(teacherUser)
      .execute();

    const loginInput: LoginInput = {
      email: 'teacher@example.com',
      password: 'teacherpass'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeDefined();
    expect(result!.role).toEqual('teacher');
    expect(result!.email).toEqual('teacher@example.com');
  });
});