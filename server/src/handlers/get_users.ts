import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUsers(): Promise<User[]> {
    try {
        // Fetch all users from the database
        // Note: This returns all fields including password_hash for admin purposes
        // In a real application, you might want to exclude sensitive fields
        const users = await db.select()
            .from(usersTable)
            .execute();

        return users;
    } catch (error) {
        console.error('Failed to fetch users:', error);
        throw error;
    }
}

export async function getUserById(userId: number): Promise<User | null> {
    try {
        // Fetch specific user by ID
        const users = await db.select()
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .execute();

        // Return the user if found, null otherwise
        return users.length > 0 ? users[0] : null;
    } catch (error) {
        console.error('Failed to fetch user by ID:', error);
        throw error;
    }
}