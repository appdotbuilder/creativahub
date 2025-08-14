import { z } from 'zod';

// User role enum
export const userRoleEnum = z.enum(['student', 'teacher', 'admin']);
export type UserRole = z.infer<typeof userRoleEnum>;

// Assignment status enum
export const assignmentStatusEnum = z.enum(['draft', 'published', 'closed']);
export type AssignmentStatus = z.infer<typeof assignmentStatusEnum>;

// Submission status enum
export const submissionStatusEnum = z.enum(['draft', 'submitted', 'graded']);
export type SubmissionStatus = z.infer<typeof submissionStatusEnum>;

// Course status enum
export const courseStatusEnum = z.enum(['draft', 'published', 'archived']);
export type CourseStatus = z.infer<typeof courseStatusEnum>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string(),
  password_hash: z.string(),
  full_name: z.string(),
  role: userRoleEnum,
  avatar_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Course schema
export const courseSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  teacher_id: z.number(),
  thumbnail_url: z.string().nullable(),
  status: courseStatusEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Course = z.infer<typeof courseSchema>;

// Course enrollment schema
export const courseEnrollmentSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  student_id: z.number(),
  enrolled_at: z.coerce.date()
});

export type CourseEnrollment = z.infer<typeof courseEnrollmentSchema>;

// Learning material schema
export const learningMaterialSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  content_url: z.string().nullable(),
  file_url: z.string().nullable(),
  material_type: z.string(),
  order_index: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type LearningMaterial = z.infer<typeof learningMaterialSchema>;

// Assignment schema
export const assignmentSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  due_date: z.coerce.date().nullable(),
  max_score: z.number(),
  status: assignmentStatusEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Assignment = z.infer<typeof assignmentSchema>;

// Assignment submission schema
export const assignmentSubmissionSchema = z.object({
  id: z.number(),
  assignment_id: z.number(),
  student_id: z.number(),
  submission_url: z.string().nullable(),
  submission_text: z.string().nullable(),
  score: z.number().nullable(),
  feedback: z.string().nullable(),
  status: submissionStatusEnum,
  submitted_at: z.coerce.date().nullable(),
  graded_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type AssignmentSubmission = z.infer<typeof assignmentSubmissionSchema>;

// Portfolio project schema
export const portfolioProjectSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  project_url: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  tags: z.string().nullable(),
  is_public: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PortfolioProject = z.infer<typeof portfolioProjectSchema>;

// Input schemas for creating entities

// Create user input schema
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string(),
  role: userRoleEnum,
  avatar_url: z.string().nullable().optional()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Update user input schema
export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  full_name: z.string().optional(),
  avatar_url: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Create course input schema
export const createCourseInputSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  teacher_id: z.number(),
  thumbnail_url: z.string().nullable().optional(),
  status: courseStatusEnum.optional()
});

export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;

// Update course input schema
export const updateCourseInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  status: courseStatusEnum.optional()
});

export type UpdateCourseInput = z.infer<typeof updateCourseInputSchema>;

// Create learning material input schema
export const createLearningMaterialInputSchema = z.object({
  course_id: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  content_url: z.string().nullable().optional(),
  file_url: z.string().nullable().optional(),
  material_type: z.string(),
  order_index: z.number().int()
});

export type CreateLearningMaterialInput = z.infer<typeof createLearningMaterialInputSchema>;

// Create assignment input schema
export const createAssignmentInputSchema = z.object({
  course_id: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  max_score: z.number().positive(),
  status: assignmentStatusEnum.optional()
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentInputSchema>;

// Create assignment submission input schema
export const createAssignmentSubmissionInputSchema = z.object({
  assignment_id: z.number(),
  student_id: z.number(),
  submission_url: z.string().nullable().optional(),
  submission_text: z.string().nullable().optional()
});

export type CreateAssignmentSubmissionInput = z.infer<typeof createAssignmentSubmissionInputSchema>;

// Grade assignment submission input schema
export const gradeAssignmentSubmissionInputSchema = z.object({
  id: z.number(),
  score: z.number().min(0),
  feedback: z.string().nullable().optional()
});

export type GradeAssignmentSubmissionInput = z.infer<typeof gradeAssignmentSubmissionInputSchema>;

// Create portfolio project input schema
export const createPortfolioProjectInputSchema = z.object({
  student_id: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  project_url: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  is_public: z.boolean().optional()
});

export type CreatePortfolioProjectInput = z.infer<typeof createPortfolioProjectInputSchema>;

// Enroll in course input schema
export const enrollInCourseInputSchema = z.object({
  course_id: z.number(),
  student_id: z.number()
});

export type EnrollInCourseInput = z.infer<typeof enrollInCourseInputSchema>;

// Auth schemas
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Query parameter schemas
export const getUserCoursesInputSchema = z.object({
  user_id: z.number(),
  role: userRoleEnum
});

export type GetUserCoursesInput = z.infer<typeof getUserCoursesInputSchema>;

export const getCourseDetailsInputSchema = z.object({
  course_id: z.number()
});

export type GetCourseDetailsInput = z.infer<typeof getCourseDetailsInputSchema>;

export const getStudentPortfolioInputSchema = z.object({
  student_id: z.number()
});

export type GetStudentPortfolioInput = z.infer<typeof getStudentPortfolioInputSchema>;