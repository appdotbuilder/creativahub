import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  assignmentsTable, 
  assignmentSubmissionsTable 
} from '../db/schema';
import { getAssignmentSubmissions, getStudentSubmissions } from '../handlers/get_assignment_submissions';

// Test data
const testTeacher = {
  email: 'teacher@test.com',
  password_hash: 'hashed_password',
  full_name: 'Test Teacher',
  role: 'teacher' as const,
  avatar_url: null,
  is_active: true
};

const testStudent1 = {
  email: 'student1@test.com',
  password_hash: 'hashed_password',
  full_name: 'Test Student 1',
  role: 'student' as const,
  avatar_url: null,
  is_active: true
};

const testStudent2 = {
  email: 'student2@test.com',
  password_hash: 'hashed_password',
  full_name: 'Test Student 2',
  role: 'student' as const,
  avatar_url: null,
  is_active: true
};

describe('getAssignmentSubmissions and getStudentSubmissions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch all submissions for a specific assignment', async () => {
    // Create prerequisite data
    const [teacher] = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();

    const [student1] = await db.insert(usersTable)
      .values(testStudent1)
      .returning()
      .execute();

    const [student2] = await db.insert(usersTable)
      .values(testStudent2)
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id,
        thumbnail_url: null,
        status: 'published'
      })
      .returning()
      .execute();

    const [assignment] = await db.insert(assignmentsTable)
      .values({
        course_id: course.id,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date('2024-12-31'),
        max_score: '100.00', // Convert to string for numeric column
        status: 'published'
      })
      .returning()
      .execute();

    // Create submissions for the assignment
    await db.insert(assignmentSubmissionsTable)
      .values([
        {
          assignment_id: assignment.id,
          student_id: student1.id,
          submission_url: 'https://example.com/submission1',
          submission_text: 'Student 1 submission',
          score: '85.50', // Convert to string for numeric column
          feedback: 'Good work',
          status: 'graded',
          submitted_at: new Date(),
          graded_at: new Date()
        },
        {
          assignment_id: assignment.id,
          student_id: student2.id,
          submission_url: 'https://example.com/submission2',
          submission_text: 'Student 2 submission',
          score: '92.00', // Convert to string for numeric column
          feedback: 'Excellent',
          status: 'graded',
          submitted_at: new Date(),
          graded_at: new Date()
        }
      ])
      .execute();

    const submissions = await getAssignmentSubmissions(assignment.id);

    expect(submissions).toHaveLength(2);
    expect(submissions[0].assignment_id).toEqual(assignment.id);
    expect(submissions[1].assignment_id).toEqual(assignment.id);
    
    // Verify numeric conversion
    expect(typeof submissions[0].score).toBe('number');
    expect(typeof submissions[1].score).toBe('number');
    expect(submissions[0].score).toEqual(85.5);
    expect(submissions[1].score).toEqual(92);

    // Verify both students' submissions are included
    const studentIds = submissions.map(s => s.student_id).sort();
    expect(studentIds).toEqual([student1.id, student2.id].sort());
  });

  it('should return empty array when assignment has no submissions', async () => {
    // Create prerequisite data
    const [teacher] = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id,
        thumbnail_url: null,
        status: 'published'
      })
      .returning()
      .execute();

    const [assignment] = await db.insert(assignmentsTable)
      .values({
        course_id: course.id,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date('2024-12-31'),
        max_score: '100.00', // Convert to string for numeric column
        status: 'published'
      })
      .returning()
      .execute();

    const submissions = await getAssignmentSubmissions(assignment.id);

    expect(submissions).toHaveLength(0);
  });

  it('should fetch all submissions by a specific student', async () => {
    // Create prerequisite data
    const [teacher] = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();

    const [student] = await db.insert(usersTable)
      .values(testStudent1)
      .returning()
      .execute();

    const [course1] = await db.insert(coursesTable)
      .values({
        title: 'Test Course 1',
        description: 'A test course',
        teacher_id: teacher.id,
        thumbnail_url: null,
        status: 'published'
      })
      .returning()
      .execute();

    const [course2] = await db.insert(coursesTable)
      .values({
        title: 'Test Course 2',
        description: 'Another test course',
        teacher_id: teacher.id,
        thumbnail_url: null,
        status: 'published'
      })
      .returning()
      .execute();

    const [assignment1] = await db.insert(assignmentsTable)
      .values({
        course_id: course1.id,
        title: 'Assignment 1',
        description: 'First assignment',
        due_date: new Date('2024-12-31'),
        max_score: '100.00', // Convert to string for numeric column
        status: 'published'
      })
      .returning()
      .execute();

    const [assignment2] = await db.insert(assignmentsTable)
      .values({
        course_id: course2.id,
        title: 'Assignment 2',
        description: 'Second assignment',
        due_date: new Date('2024-12-31'),
        max_score: '50.00', // Convert to string for numeric column
        status: 'published'
      })
      .returning()
      .execute();

    // Create submissions by the student across multiple assignments
    await db.insert(assignmentSubmissionsTable)
      .values([
        {
          assignment_id: assignment1.id,
          student_id: student.id,
          submission_url: 'https://example.com/submission1',
          submission_text: 'Submission for assignment 1',
          score: '85.50', // Convert to string for numeric column
          feedback: 'Good work',
          status: 'graded',
          submitted_at: new Date(),
          graded_at: new Date()
        },
        {
          assignment_id: assignment2.id,
          student_id: student.id,
          submission_url: 'https://example.com/submission2',
          submission_text: 'Submission for assignment 2',
          score: '45.00', // Convert to string for numeric column
          feedback: 'Needs improvement',
          status: 'graded',
          submitted_at: new Date(),
          graded_at: new Date()
        }
      ])
      .execute();

    const submissions = await getStudentSubmissions(student.id);

    expect(submissions).toHaveLength(2);
    expect(submissions.every(s => s.student_id === student.id)).toBe(true);
    
    // Verify numeric conversion
    expect(typeof submissions[0].score).toBe('number');
    expect(typeof submissions[1].score).toBe('number');
    
    // Verify both assignments are included
    const assignmentIds = submissions.map(s => s.assignment_id).sort();
    expect(assignmentIds).toEqual([assignment1.id, assignment2.id].sort());
  });

  it('should return empty array when student has no submissions', async () => {
    const [student] = await db.insert(usersTable)
      .values(testStudent1)
      .returning()
      .execute();

    const submissions = await getStudentSubmissions(student.id);

    expect(submissions).toHaveLength(0);
  });

  it('should handle null scores correctly', async () => {
    // Create prerequisite data
    const [teacher] = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();

    const [student] = await db.insert(usersTable)
      .values(testStudent1)
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id,
        thumbnail_url: null,
        status: 'published'
      })
      .returning()
      .execute();

    const [assignment] = await db.insert(assignmentsTable)
      .values({
        course_id: course.id,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date('2024-12-31'),
        max_score: '100.00', // Convert to string for numeric column
        status: 'published'
      })
      .returning()
      .execute();

    // Create submission without score (ungraded)
    await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignment.id,
        student_id: student.id,
        submission_url: 'https://example.com/submission',
        submission_text: 'Ungraded submission',
        score: null, // No score yet
        feedback: null,
        status: 'submitted',
        submitted_at: new Date(),
        graded_at: null
      })
      .execute();

    const submissions = await getAssignmentSubmissions(assignment.id);

    expect(submissions).toHaveLength(1);
    expect(submissions[0].score).toBeNull();
    expect(submissions[0].status).toEqual('submitted');
  });

  it('should handle mixed graded and ungraded submissions', async () => {
    // Create prerequisite data
    const [teacher] = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();

    const [student1] = await db.insert(usersTable)
      .values(testStudent1)
      .returning()
      .execute();

    const [student2] = await db.insert(usersTable)
      .values(testStudent2)
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id,
        thumbnail_url: null,
        status: 'published'
      })
      .returning()
      .execute();

    const [assignment] = await db.insert(assignmentsTable)
      .values({
        course_id: course.id,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date('2024-12-31'),
        max_score: '100.00', // Convert to string for numeric column
        status: 'published'
      })
      .returning()
      .execute();

    // Create one graded and one ungraded submission
    await db.insert(assignmentSubmissionsTable)
      .values([
        {
          assignment_id: assignment.id,
          student_id: student1.id,
          submission_url: 'https://example.com/submission1',
          submission_text: 'Graded submission',
          score: '88.75', // Convert to string for numeric column
          feedback: 'Well done',
          status: 'graded',
          submitted_at: new Date(),
          graded_at: new Date()
        },
        {
          assignment_id: assignment.id,
          student_id: student2.id,
          submission_url: 'https://example.com/submission2',
          submission_text: 'Ungraded submission',
          score: null,
          feedback: null,
          status: 'submitted',
          submitted_at: new Date(),
          graded_at: null
        }
      ])
      .execute();

    const submissions = await getAssignmentSubmissions(assignment.id);

    expect(submissions).toHaveLength(2);
    
    // Find graded and ungraded submissions
    const gradedSubmission = submissions.find(s => s.status === 'graded');
    const ungradedSubmission = submissions.find(s => s.status === 'submitted');

    expect(gradedSubmission).toBeDefined();
    expect(ungradedSubmission).toBeDefined();
    
    expect(typeof gradedSubmission!.score).toBe('number');
    expect(gradedSubmission!.score).toEqual(88.75);
    expect(ungradedSubmission!.score).toBeNull();
  });
});