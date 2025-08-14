import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  courseEnrollmentsTable, 
  assignmentsTable, 
  assignmentSubmissionsTable, 
  portfolioProjectsTable 
} from '../db/schema';
import { type UserRole } from '../schema';
import { eq, count, and, SQL } from 'drizzle-orm';

export interface DashboardData {
    totalUsers?: number;
    totalCourses?: number;
    totalStudents?: number;
    totalTeachers?: number;
    enrolledCourses?: number;
    activeAssignments?: number;
    completedAssignments?: number;
    portfolioProjects?: number;
    teachingCourses?: number;
    totalAssignments?: number;
    pendingSubmissions?: number;
}

export async function getDashboardData(userId: number, role: UserRole): Promise<DashboardData> {
  try {
    switch (role) {
      case 'admin':
        return await getAdminDashboardData();
      case 'teacher':
        return await getTeacherDashboardData(userId);
      case 'student':
        return await getStudentDashboardData(userId);
      default:
        return {};
    }
  } catch (error) {
    console.error('Dashboard data retrieval failed:', error);
    throw error;
  }
}

async function getAdminDashboardData(): Promise<DashboardData> {
  // Get total users count
  const totalUsersResult = await db.select({ count: count() })
    .from(usersTable)
    .execute();

  // Get total courses count
  const totalCoursesResult = await db.select({ count: count() })
    .from(coursesTable)
    .execute();

  // Get total students count
  const totalStudentsResult = await db.select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.role, 'student'))
    .execute();

  // Get total teachers count
  const totalTeachersResult = await db.select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.role, 'teacher'))
    .execute();

  return {
    totalUsers: totalUsersResult[0].count,
    totalCourses: totalCoursesResult[0].count,
    totalStudents: totalStudentsResult[0].count,
    totalTeachers: totalTeachersResult[0].count
  };
}

async function getTeacherDashboardData(userId: number): Promise<DashboardData> {
  // Get teaching courses count
  const teachingCoursesResult = await db.select({ count: count() })
    .from(coursesTable)
    .where(eq(coursesTable.teacher_id, userId))
    .execute();

  // Get total assignments count for teacher's courses
  const totalAssignmentsResult = await db.select({ count: count() })
    .from(assignmentsTable)
    .innerJoin(coursesTable, eq(assignmentsTable.course_id, coursesTable.id))
    .where(eq(coursesTable.teacher_id, userId))
    .execute();

  // Get pending submissions count (submitted but not graded)
  const pendingSubmissionsResult = await db.select({ count: count() })
    .from(assignmentSubmissionsTable)
    .innerJoin(assignmentsTable, eq(assignmentSubmissionsTable.assignment_id, assignmentsTable.id))
    .innerJoin(coursesTable, eq(assignmentsTable.course_id, coursesTable.id))
    .where(
      and(
        eq(coursesTable.teacher_id, userId),
        eq(assignmentSubmissionsTable.status, 'submitted')
      )
    )
    .execute();

  return {
    teachingCourses: teachingCoursesResult[0].count,
    totalAssignments: totalAssignmentsResult[0].count,
    pendingSubmissions: pendingSubmissionsResult[0].count
  };
}

async function getStudentDashboardData(userId: number): Promise<DashboardData> {
  // Get enrolled courses count
  const enrolledCoursesResult = await db.select({ count: count() })
    .from(courseEnrollmentsTable)
    .where(eq(courseEnrollmentsTable.student_id, userId))
    .execute();

  // Get active assignments count (published assignments in enrolled courses)
  const activeAssignmentsResult = await db.select({ count: count() })
    .from(assignmentsTable)
    .innerJoin(courseEnrollmentsTable, eq(assignmentsTable.course_id, courseEnrollmentsTable.course_id))
    .where(
      and(
        eq(courseEnrollmentsTable.student_id, userId),
        eq(assignmentsTable.status, 'published')
      )
    )
    .execute();

  // Get completed assignments count (graded submissions)
  const completedAssignmentsResult = await db.select({ count: count() })
    .from(assignmentSubmissionsTable)
    .where(
      and(
        eq(assignmentSubmissionsTable.student_id, userId),
        eq(assignmentSubmissionsTable.status, 'graded')
      )
    )
    .execute();

  // Get portfolio projects count
  const portfolioProjectsResult = await db.select({ count: count() })
    .from(portfolioProjectsTable)
    .where(eq(portfolioProjectsTable.student_id, userId))
    .execute();

  return {
    enrolledCourses: enrolledCoursesResult[0].count,
    activeAssignments: activeAssignmentsResult[0].count,
    completedAssignments: completedAssignmentsResult[0].count,
    portfolioProjects: portfolioProjectsResult[0].count
  };
}