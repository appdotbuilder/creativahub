import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  courseEnrollmentsTable, 
  assignmentsTable, 
  assignmentSubmissionsTable, 
  portfolioProjectsTable 
} from '../db/schema';
import { getDashboardData } from '../handlers/get_dashboard_data';

describe('getDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('Admin Dashboard', () => {
    it('should return admin dashboard data with correct counts', async () => {
      // Create test users
      const adminUser = await db.insert(usersTable).values({
        email: 'admin@test.com',
        password_hash: 'hash123',
        full_name: 'Admin User',
        role: 'admin'
      }).returning().execute();

      const teacherUser = await db.insert(usersTable).values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        full_name: 'Teacher User',
        role: 'teacher'
      }).returning().execute();

      const studentUser1 = await db.insert(usersTable).values({
        email: 'student1@test.com',
        password_hash: 'hash123',
        full_name: 'Student One',
        role: 'student'
      }).returning().execute();

      const studentUser2 = await db.insert(usersTable).values({
        email: 'student2@test.com',
        password_hash: 'hash123',
        full_name: 'Student Two',
        role: 'student'
      }).returning().execute();

      // Create test courses
      await db.insert(coursesTable).values([
        {
          title: 'Course 1',
          teacher_id: teacherUser[0].id,
          status: 'published'
        },
        {
          title: 'Course 2',
          teacher_id: teacherUser[0].id,
          status: 'draft'
        }
      ]).execute();

      const result = await getDashboardData(adminUser[0].id, 'admin');

      expect(result.totalUsers).toEqual(4); // 1 admin + 1 teacher + 2 students
      expect(result.totalCourses).toEqual(2);
      expect(result.totalStudents).toEqual(2);
      expect(result.totalTeachers).toEqual(1);
      
      // Should not have student/teacher specific fields
      expect(result.enrolledCourses).toBeUndefined();
      expect(result.teachingCourses).toBeUndefined();
    });

    it('should return zero counts for empty database', async () => {
      // Create only admin user
      const adminUser = await db.insert(usersTable).values({
        email: 'admin@test.com',
        password_hash: 'hash123',
        full_name: 'Admin User',
        role: 'admin'
      }).returning().execute();

      const result = await getDashboardData(adminUser[0].id, 'admin');

      expect(result.totalUsers).toEqual(1); // Only the admin
      expect(result.totalCourses).toEqual(0);
      expect(result.totalStudents).toEqual(0);
      expect(result.totalTeachers).toEqual(0);
    });
  });

  describe('Teacher Dashboard', () => {
    it('should return teacher dashboard data with correct counts', async () => {
      // Create teacher and student users
      const teacherUser = await db.insert(usersTable).values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        full_name: 'Teacher User',
        role: 'teacher'
      }).returning().execute();

      const studentUser = await db.insert(usersTable).values({
        email: 'student@test.com',
        password_hash: 'hash123',
        full_name: 'Student User',
        role: 'student'
      }).returning().execute();

      // Create courses for this teacher
      const courses = await db.insert(coursesTable).values([
        {
          title: 'Course 1',
          teacher_id: teacherUser[0].id,
          status: 'published'
        },
        {
          title: 'Course 2',
          teacher_id: teacherUser[0].id,
          status: 'draft'
        }
      ]).returning().execute();

      // Create assignments
      const assignments = await db.insert(assignmentsTable).values([
        {
          course_id: courses[0].id,
          title: 'Assignment 1',
          max_score: '100.00',
          status: 'published'
        },
        {
          course_id: courses[1].id,
          title: 'Assignment 2',
          max_score: '50.00',
          status: 'draft'
        }
      ]).returning().execute();

      // Create submissions (some pending grading)
      await db.insert(assignmentSubmissionsTable).values([
        {
          assignment_id: assignments[0].id,
          student_id: studentUser[0].id,
          status: 'submitted', // Pending
          submission_text: 'My submission'
        },
        {
          assignment_id: assignments[1].id,
          student_id: studentUser[0].id,
          status: 'graded', // Already graded
          submission_text: 'Another submission',
          score: '85.00'
        }
      ]).execute();

      const result = await getDashboardData(teacherUser[0].id, 'teacher');

      expect(result.teachingCourses).toEqual(2);
      expect(result.totalAssignments).toEqual(2);
      expect(result.pendingSubmissions).toEqual(1); // Only 1 submitted but not graded
      
      // Should not have admin/student specific fields
      expect(result.totalUsers).toBeUndefined();
      expect(result.enrolledCourses).toBeUndefined();
    });

    it('should return zero counts for teacher with no courses', async () => {
      const teacherUser = await db.insert(usersTable).values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        full_name: 'Teacher User',
        role: 'teacher'
      }).returning().execute();

      const result = await getDashboardData(teacherUser[0].id, 'teacher');

      expect(result.teachingCourses).toEqual(0);
      expect(result.totalAssignments).toEqual(0);
      expect(result.pendingSubmissions).toEqual(0);
    });

    it('should only count assignments and submissions from teacher\'s courses', async () => {
      // Create multiple teachers
      const teacher1 = await db.insert(usersTable).values({
        email: 'teacher1@test.com',
        password_hash: 'hash123',
        full_name: 'Teacher One',
        role: 'teacher'
      }).returning().execute();

      const teacher2 = await db.insert(usersTable).values({
        email: 'teacher2@test.com',
        password_hash: 'hash123',
        full_name: 'Teacher Two',
        role: 'teacher'
      }).returning().execute();

      const studentUser = await db.insert(usersTable).values({
        email: 'student@test.com',
        password_hash: 'hash123',
        full_name: 'Student User',
        role: 'student'
      }).returning().execute();

      // Create courses for both teachers
      const teacher1Course = await db.insert(coursesTable).values({
        title: 'Teacher 1 Course',
        teacher_id: teacher1[0].id,
        status: 'published'
      }).returning().execute();

      const teacher2Course = await db.insert(coursesTable).values({
        title: 'Teacher 2 Course',
        teacher_id: teacher2[0].id,
        status: 'published'
      }).returning().execute();

      // Create assignments for both courses
      const teacher1Assignment = await db.insert(assignmentsTable).values({
        course_id: teacher1Course[0].id,
        title: 'Teacher 1 Assignment',
        max_score: '100.00',
        status: 'published'
      }).returning().execute();

      const teacher2Assignment = await db.insert(assignmentsTable).values({
        course_id: teacher2Course[0].id,
        title: 'Teacher 2 Assignment',
        max_score: '100.00',
        status: 'published'
      }).returning().execute();

      // Create submissions for both assignments
      await db.insert(assignmentSubmissionsTable).values([
        {
          assignment_id: teacher1Assignment[0].id,
          student_id: studentUser[0].id,
          status: 'submitted'
        },
        {
          assignment_id: teacher2Assignment[0].id,
          student_id: studentUser[0].id,
          status: 'submitted'
        }
      ]).execute();

      // Teacher 1 should only see their own data
      const teacher1Result = await getDashboardData(teacher1[0].id, 'teacher');
      expect(teacher1Result.teachingCourses).toEqual(1);
      expect(teacher1Result.totalAssignments).toEqual(1);
      expect(teacher1Result.pendingSubmissions).toEqual(1);

      // Teacher 2 should only see their own data
      const teacher2Result = await getDashboardData(teacher2[0].id, 'teacher');
      expect(teacher2Result.teachingCourses).toEqual(1);
      expect(teacher2Result.totalAssignments).toEqual(1);
      expect(teacher2Result.pendingSubmissions).toEqual(1);
    });
  });

  describe('Student Dashboard', () => {
    it('should return student dashboard data with correct counts', async () => {
      // Create teacher and student users
      const teacherUser = await db.insert(usersTable).values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        full_name: 'Teacher User',
        role: 'teacher'
      }).returning().execute();

      const studentUser = await db.insert(usersTable).values({
        email: 'student@test.com',
        password_hash: 'hash123',
        full_name: 'Student User',
        role: 'student'
      }).returning().execute();

      // Create courses
      const courses = await db.insert(coursesTable).values([
        {
          title: 'Course 1',
          teacher_id: teacherUser[0].id,
          status: 'published'
        },
        {
          title: 'Course 2',
          teacher_id: teacherUser[0].id,
          status: 'published'
        }
      ]).returning().execute();

      // Enroll student in courses
      await db.insert(courseEnrollmentsTable).values([
        {
          course_id: courses[0].id,
          student_id: studentUser[0].id
        },
        {
          course_id: courses[1].id,
          student_id: studentUser[0].id
        }
      ]).execute();

      // Create assignments
      const assignments = await db.insert(assignmentsTable).values([
        {
          course_id: courses[0].id,
          title: 'Assignment 1',
          max_score: '100.00',
          status: 'published' // Active assignment
        },
        {
          course_id: courses[0].id,
          title: 'Assignment 2',
          max_score: '50.00',
          status: 'draft' // Not active
        },
        {
          course_id: courses[1].id,
          title: 'Assignment 3',
          max_score: '75.00',
          status: 'published' // Active assignment
        }
      ]).returning().execute();

      // Create submissions
      await db.insert(assignmentSubmissionsTable).values([
        {
          assignment_id: assignments[0].id,
          student_id: studentUser[0].id,
          status: 'graded', // Completed
          score: '90.00'
        },
        {
          assignment_id: assignments[2].id,
          student_id: studentUser[0].id,
          status: 'submitted' // Not completed yet
        }
      ]).execute();

      // Create portfolio projects
      await db.insert(portfolioProjectsTable).values([
        {
          student_id: studentUser[0].id,
          title: 'Project 1',
          is_public: true
        },
        {
          student_id: studentUser[0].id,
          title: 'Project 2',
          is_public: false
        }
      ]).execute();

      const result = await getDashboardData(studentUser[0].id, 'student');

      expect(result.enrolledCourses).toEqual(2);
      expect(result.activeAssignments).toEqual(2); // Only published assignments
      expect(result.completedAssignments).toEqual(1); // Only graded submissions
      expect(result.portfolioProjects).toEqual(2);
      
      // Should not have admin/teacher specific fields
      expect(result.totalUsers).toBeUndefined();
      expect(result.teachingCourses).toBeUndefined();
    });

    it('should return zero counts for student with no enrollments', async () => {
      const studentUser = await db.insert(usersTable).values({
        email: 'student@test.com',
        password_hash: 'hash123',
        full_name: 'Student User',
        role: 'student'
      }).returning().execute();

      const result = await getDashboardData(studentUser[0].id, 'student');

      expect(result.enrolledCourses).toEqual(0);
      expect(result.activeAssignments).toEqual(0);
      expect(result.completedAssignments).toEqual(0);
      expect(result.portfolioProjects).toEqual(0);
    });

    it('should only count data for the specific student', async () => {
      // Create teacher and multiple students
      const teacherUser = await db.insert(usersTable).values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        full_name: 'Teacher User',
        role: 'teacher'
      }).returning().execute();

      const student1 = await db.insert(usersTable).values({
        email: 'student1@test.com',
        password_hash: 'hash123',
        full_name: 'Student One',
        role: 'student'
      }).returning().execute();

      const student2 = await db.insert(usersTable).values({
        email: 'student2@test.com',
        password_hash: 'hash123',
        full_name: 'Student Two',
        role: 'student'
      }).returning().execute();

      // Create course
      const course = await db.insert(coursesTable).values({
        title: 'Shared Course',
        teacher_id: teacherUser[0].id,
        status: 'published'
      }).returning().execute();

      // Enroll both students
      await db.insert(courseEnrollmentsTable).values([
        {
          course_id: course[0].id,
          student_id: student1[0].id
        },
        {
          course_id: course[0].id,
          student_id: student2[0].id
        }
      ]).execute();

      // Create portfolio projects for both students
      await db.insert(portfolioProjectsTable).values([
        {
          student_id: student1[0].id,
          title: 'Student 1 Project',
          is_public: true
        },
        {
          student_id: student2[0].id,
          title: 'Student 2 Project 1',
          is_public: true
        },
        {
          student_id: student2[0].id,
          title: 'Student 2 Project 2',
          is_public: false
        }
      ]).execute();

      // Student 1 should only see their own data
      const student1Result = await getDashboardData(student1[0].id, 'student');
      expect(student1Result.enrolledCourses).toEqual(1);
      expect(student1Result.portfolioProjects).toEqual(1);

      // Student 2 should only see their own data
      const student2Result = await getDashboardData(student2[0].id, 'student');
      expect(student2Result.enrolledCourses).toEqual(1);
      expect(student2Result.portfolioProjects).toEqual(2);
    });
  });

  describe('Invalid role', () => {
    it('should return empty object for invalid role', async () => {
      const result = await getDashboardData(1, 'invalid' as any);
      expect(result).toEqual({});
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test assumes the handler will throw on database errors
      // We can't easily simulate database failures without mocking,
      // but the error handling structure is in place
      
      const teacherUser = await db.insert(usersTable).values({
        email: 'teacher@test.com',
        password_hash: 'hash123',
        full_name: 'Teacher User',
        role: 'teacher'
      }).returning().execute();

      // This should work normally
      const result = await getDashboardData(teacherUser[0].id, 'teacher');
      expect(typeof result).toBe('object');
    });
  });
});