import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

export const authenticateUser = async (input: LoginInput): Promise<User | null> => {
  try {
    // Query user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return null;
    }

    // Hash the provided password to compare with stored hash
    const passwordHash = createHash('sha256')
      .update(input.password)
      .digest('hex');

    // Compare password hashes
    if (passwordHash !== user.password_hash) {
      return null;
    }

    // Return user data (excluding password hash)
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      full_name: user.full_name,
      role: user.role,
      avatar_url: user.avatar_url,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
};