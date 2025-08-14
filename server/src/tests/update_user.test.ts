import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
const createTestUser = async (): Promise<number> => {
  const result = await db.insert(usersTable)
    .values({
      email: 'test@example.com',
      password_hash: 'hashed_test_password',
      full_name: 'Test User',
      role: 'student',
      avatar_url: null,
      is_active: true
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user email', async () => {
    const userId = await createTestUser();

    const input: UpdateUserInput = {
      id: userId,
      email: 'updated@example.com'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('updated@example.com');
    expect(result.full_name).toEqual('Test User'); // Should remain unchanged
    expect(result.role).toEqual('student');
    expect(result.is_active).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user full name', async () => {
    const userId = await createTestUser();

    const input: UpdateUserInput = {
      id: userId,
      full_name: 'Updated Name'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
    expect(result.full_name).toEqual('Updated Name');
    expect(result.role).toEqual('student');
    expect(result.is_active).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user avatar_url', async () => {
    const userId = await createTestUser();

    const input: UpdateUserInput = {
      id: userId,
      avatar_url: 'https://example.com/avatar.jpg'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(userId);
    expect(result.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result.full_name).toEqual('Test User'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set avatar_url to null', async () => {
    // First create a user with an avatar
    const userId = await createTestUser();
    
    // Update to have an avatar
    await db.update(usersTable)
      .set({ avatar_url: 'https://example.com/old-avatar.jpg' })
      .where(eq(usersTable.id, userId))
      .execute();

    const input: UpdateUserInput = {
      id: userId,
      avatar_url: null
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(userId);
    expect(result.avatar_url).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user is_active status', async () => {
    const userId = await createTestUser();

    const input: UpdateUserInput = {
      id: userId,
      is_active: false
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(userId);
    expect(result.is_active).toEqual(false);
    expect(result.full_name).toEqual('Test User'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const userId = await createTestUser();

    const input: UpdateUserInput = {
      id: userId,
      email: 'multi-update@example.com',
      full_name: 'Multi Updated Name',
      avatar_url: 'https://example.com/multi-avatar.jpg',
      is_active: false
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('multi-update@example.com');
    expect(result.full_name).toEqual('Multi Updated Name');
    expect(result.avatar_url).toEqual('https://example.com/multi-avatar.jpg');
    expect(result.is_active).toEqual(false);
    expect(result.role).toEqual('student'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user in database', async () => {
    const userId = await createTestUser();

    const input: UpdateUserInput = {
      id: userId,
      email: 'db-updated@example.com',
      full_name: 'DB Updated Name'
    };

    await updateUser(input);

    // Verify the changes were persisted in the database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('db-updated@example.com');
    expect(users[0].full_name).toEqual('DB Updated Name');
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update updated_at timestamp', async () => {
    const userId = await createTestUser();

    // Get original timestamp
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const originalTimestamp = originalUser[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateUserInput = {
      id: userId,
      full_name: 'Updated for Timestamp'
    };

    const result = await updateUser(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should throw error when user does not exist', async () => {
    const input: UpdateUserInput = {
      id: 99999, // Non-existent user ID
      email: 'nonexistent@example.com'
    };

    await expect(updateUser(input)).rejects.toThrow(/User with id 99999 not found/);
  });

  it('should handle partial updates correctly', async () => {
    const userId = await createTestUser();

    // Update only email
    const input1: UpdateUserInput = {
      id: userId,
      email: 'partial1@example.com'
    };

    const result1 = await updateUser(input1);
    expect(result1.email).toEqual('partial1@example.com');
    expect(result1.full_name).toEqual('Test User'); // Original value

    // Update only full_name
    const input2: UpdateUserInput = {
      id: userId,
      full_name: 'Partial Update Name'
    };

    const result2 = await updateUser(input2);
    expect(result2.email).toEqual('partial1@example.com'); // Previous update
    expect(result2.full_name).toEqual('Partial Update Name');
  });

  it('should handle email uniqueness constraint violation', async () => {
    // Create two users
    const user1Id = await createTestUser();
    
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password2',
        full_name: 'User Two',
        role: 'teacher'
      })
      .returning()
      .execute();

    const user2Id = user2Result[0].id;

    // Try to update user2 with user1's email
    const input: UpdateUserInput = {
      id: user2Id,
      email: 'test@example.com' // This email already exists for user1
    };

    await expect(updateUser(input)).rejects.toThrow();
  });
});