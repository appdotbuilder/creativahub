import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers, getUserById } from '../handlers/get_users';
import { eq } from 'drizzle-orm';

// Test user data
const testUser1 = {
  email: 'student@example.com',
  password_hash: 'hashed_password_123',
  full_name: 'John Student',
  role: 'student' as const,
  avatar_url: null,
  is_active: true
};

const testUser2 = {
  email: 'teacher@example.com',
  password_hash: 'hashed_password_456',
  full_name: 'Jane Teacher',
  role: 'teacher' as const,
  avatar_url: 'https://example.com/avatar.jpg',
  is_active: true
};

const testUser3 = {
  email: 'admin@example.com',
  password_hash: 'hashed_password_789',
  full_name: 'Admin User',
  role: 'admin' as const,
  avatar_url: null,
  is_active: false
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const users = await getUsers();
    expect(users).toEqual([]);
  });

  it('should return all users', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([testUser1, testUser2, testUser3])
      .execute();

    const users = await getUsers();

    expect(users).toHaveLength(3);
    
    // Verify all fields are present including sensitive ones
    const student = users.find(u => u.email === 'student@example.com');
    expect(student).toBeDefined();
    expect(student?.full_name).toEqual('John Student');
    expect(student?.role).toEqual('student');
    expect(student?.password_hash).toEqual('hashed_password_123');
    expect(student?.avatar_url).toBeNull();
    expect(student?.is_active).toBe(true);
    expect(student?.created_at).toBeInstanceOf(Date);
    expect(student?.updated_at).toBeInstanceOf(Date);
    expect(student?.id).toBeDefined();

    const teacher = users.find(u => u.email === 'teacher@example.com');
    expect(teacher).toBeDefined();
    expect(teacher?.full_name).toEqual('Jane Teacher');
    expect(teacher?.role).toEqual('teacher');
    expect(teacher?.avatar_url).toEqual('https://example.com/avatar.jpg');

    const admin = users.find(u => u.email === 'admin@example.com');
    expect(admin).toBeDefined();
    expect(admin?.full_name).toEqual('Admin User');
    expect(admin?.role).toEqual('admin');
    expect(admin?.is_active).toBe(false);
  });

  it('should return users with correct timestamps', async () => {
    await db.insert(usersTable)
      .values(testUser1)
      .execute();

    const users = await getUsers();
    
    expect(users).toHaveLength(1);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
    expect(users[0].created_at.getTime()).toBeLessThanOrEqual(Date.now());
    expect(users[0].updated_at.getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when user does not exist', async () => {
    const user = await getUserById(999);
    expect(user).toBeNull();
  });

  it('should return user when user exists', async () => {
    // Create a test user
    const result = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    const createdUser = result[0];
    const fetchedUser = await getUserById(createdUser.id);

    expect(fetchedUser).not.toBeNull();
    expect(fetchedUser?.id).toEqual(createdUser.id);
    expect(fetchedUser?.email).toEqual('student@example.com');
    expect(fetchedUser?.full_name).toEqual('John Student');
    expect(fetchedUser?.role).toEqual('student');
    expect(fetchedUser?.password_hash).toEqual('hashed_password_123');
    expect(fetchedUser?.avatar_url).toBeNull();
    expect(fetchedUser?.is_active).toBe(true);
    expect(fetchedUser?.created_at).toBeInstanceOf(Date);
    expect(fetchedUser?.updated_at).toBeInstanceOf(Date);
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple test users
    const results = await db.insert(usersTable)
      .values([testUser1, testUser2, testUser3])
      .returning()
      .execute();

    const teacherUser = results.find(u => u.email === 'teacher@example.com');
    expect(teacherUser).toBeDefined();
    
    if (!teacherUser) {
      throw new Error('Teacher user not found');
    }

    const fetchedUser = await getUserById(teacherUser.id);

    expect(fetchedUser).not.toBeNull();
    expect(fetchedUser?.id).toEqual(teacherUser?.id);
    expect(fetchedUser?.email).toEqual('teacher@example.com');
    expect(fetchedUser?.full_name).toEqual('Jane Teacher');
    expect(fetchedUser?.role).toEqual('teacher');
    expect(fetchedUser?.avatar_url).toEqual('https://example.com/avatar.jpg');
  });

  it('should verify user is saved to database correctly', async () => {
    const result = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();

    const createdUser = result[0];

    // Verify user is in database using direct query
    const dbUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(dbUsers).toHaveLength(1);
    expect(dbUsers[0].email).toEqual('teacher@example.com');
    expect(dbUsers[0].full_name).toEqual('Jane Teacher');

    // Verify handler returns same data
    const handlerUser = await getUserById(createdUser.id);
    expect(handlerUser).toEqual(dbUsers[0]);
  });

  it('should handle different user roles correctly', async () => {
    const results = await db.insert(usersTable)
      .values([testUser1, testUser2, testUser3])
      .returning()
      .execute();

    for (const user of results) {
      const fetchedUser = await getUserById(user.id);
      expect(fetchedUser).not.toBeNull();
      expect(fetchedUser?.role).toEqual(user.role);
    }

    // Verify specific role types
    const studentUser = results.find(u => u.role === 'student');
    const teacherUser = results.find(u => u.role === 'teacher');
    const adminUser = results.find(u => u.role === 'admin');

    expect(studentUser?.role).toEqual('student');
    expect(teacherUser?.role).toEqual('teacher');
    expect(adminUser?.role).toEqual('admin');
  });
});