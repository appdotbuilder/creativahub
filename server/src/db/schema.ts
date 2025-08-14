import { serial, text, pgTable, timestamp, boolean, integer, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'admin']);
export const assignmentStatusEnum = pgEnum('assignment_status', ['draft', 'published', 'closed']);
export const submissionStatusEnum = pgEnum('submission_status', ['draft', 'submitted', 'graded']);
export const courseStatusEnum = pgEnum('course_status', ['draft', 'published', 'archived']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').unique().notNull(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  avatar_url: text('avatar_url'),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Courses table
export const coursesTable = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  teacher_id: integer('teacher_id').references(() => usersTable.id).notNull(),
  thumbnail_url: text('thumbnail_url'),
  status: courseStatusEnum('status').default('draft').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Course enrollments table
export const courseEnrollmentsTable = pgTable('course_enrollments', {
  id: serial('id').primaryKey(),
  course_id: integer('course_id').references(() => coursesTable.id).notNull(),
  student_id: integer('student_id').references(() => usersTable.id).notNull(),
  enrolled_at: timestamp('enrolled_at').defaultNow().notNull(),
});

// Learning materials table
export const learningMaterialsTable = pgTable('learning_materials', {
  id: serial('id').primaryKey(),
  course_id: integer('course_id').references(() => coursesTable.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  content_url: text('content_url'),
  file_url: text('file_url'),
  material_type: text('material_type').notNull(),
  order_index: integer('order_index').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Assignments table
export const assignmentsTable = pgTable('assignments', {
  id: serial('id').primaryKey(),
  course_id: integer('course_id').references(() => coursesTable.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  due_date: timestamp('due_date'),
  max_score: numeric('max_score', { precision: 5, scale: 2 }).notNull(),
  status: assignmentStatusEnum('status').default('draft').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Assignment submissions table
export const assignmentSubmissionsTable = pgTable('assignment_submissions', {
  id: serial('id').primaryKey(),
  assignment_id: integer('assignment_id').references(() => assignmentsTable.id).notNull(),
  student_id: integer('student_id').references(() => usersTable.id).notNull(),
  submission_url: text('submission_url'),
  submission_text: text('submission_text'),
  score: numeric('score', { precision: 5, scale: 2 }),
  feedback: text('feedback'),
  status: submissionStatusEnum('status').default('draft').notNull(),
  submitted_at: timestamp('submitted_at'),
  graded_at: timestamp('graded_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Portfolio projects table
export const portfolioProjectsTable = pgTable('portfolio_projects', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').references(() => usersTable.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  project_url: text('project_url'),
  thumbnail_url: text('thumbnail_url'),
  tags: text('tags'),
  is_public: boolean('is_public').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  taughtCourses: many(coursesTable),
  enrollments: many(courseEnrollmentsTable),
  submissions: many(assignmentSubmissionsTable),
  portfolioProjects: many(portfolioProjectsTable),
}));

export const coursesRelations = relations(coursesTable, ({ one, many }) => ({
  teacher: one(usersTable, {
    fields: [coursesTable.teacher_id],
    references: [usersTable.id],
  }),
  enrollments: many(courseEnrollmentsTable),
  materials: many(learningMaterialsTable),
  assignments: many(assignmentsTable),
}));

export const courseEnrollmentsRelations = relations(courseEnrollmentsTable, ({ one }) => ({
  course: one(coursesTable, {
    fields: [courseEnrollmentsTable.course_id],
    references: [coursesTable.id],
  }),
  student: one(usersTable, {
    fields: [courseEnrollmentsTable.student_id],
    references: [usersTable.id],
  }),
}));

export const learningMaterialsRelations = relations(learningMaterialsTable, ({ one }) => ({
  course: one(coursesTable, {
    fields: [learningMaterialsTable.course_id],
    references: [coursesTable.id],
  }),
}));

export const assignmentsRelations = relations(assignmentsTable, ({ one, many }) => ({
  course: one(coursesTable, {
    fields: [assignmentsTable.course_id],
    references: [coursesTable.id],
  }),
  submissions: many(assignmentSubmissionsTable),
}));

export const assignmentSubmissionsRelations = relations(assignmentSubmissionsTable, ({ one }) => ({
  assignment: one(assignmentsTable, {
    fields: [assignmentSubmissionsTable.assignment_id],
    references: [assignmentsTable.id],
  }),
  student: one(usersTable, {
    fields: [assignmentSubmissionsTable.student_id],
    references: [usersTable.id],
  }),
}));

export const portfolioProjectsRelations = relations(portfolioProjectsTable, ({ one }) => ({
  student: one(usersTable, {
    fields: [portfolioProjectsTable.student_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Course = typeof coursesTable.$inferSelect;
export type NewCourse = typeof coursesTable.$inferInsert;
export type CourseEnrollment = typeof courseEnrollmentsTable.$inferSelect;
export type NewCourseEnrollment = typeof courseEnrollmentsTable.$inferInsert;
export type LearningMaterial = typeof learningMaterialsTable.$inferSelect;
export type NewLearningMaterial = typeof learningMaterialsTable.$inferInsert;
export type Assignment = typeof assignmentsTable.$inferSelect;
export type NewAssignment = typeof assignmentsTable.$inferInsert;
export type AssignmentSubmission = typeof assignmentSubmissionsTable.$inferSelect;
export type NewAssignmentSubmission = typeof assignmentSubmissionsTable.$inferInsert;
export type PortfolioProject = typeof portfolioProjectsTable.$inferSelect;
export type NewPortfolioProject = typeof portfolioProjectsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  courses: coursesTable,
  courseEnrollments: courseEnrollmentsTable,
  learningMaterials: learningMaterialsTable,
  assignments: assignmentsTable,
  assignmentSubmissions: assignmentSubmissionsTable,
  portfolioProjects: portfolioProjectsTable,
};