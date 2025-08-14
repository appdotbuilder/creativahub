import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  loginInputSchema,
  createCourseInputSchema,
  updateCourseInputSchema,
  enrollInCourseInputSchema,
  createLearningMaterialInputSchema,
  createAssignmentInputSchema,
  createAssignmentSubmissionInputSchema,
  gradeAssignmentSubmissionInputSchema,
  createPortfolioProjectInputSchema,
  getUserCoursesInputSchema,
  getCourseDetailsInputSchema,
  getStudentPortfolioInputSchema,
  userRoleEnum
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { authenticateUser } from './handlers/authenticate_user';
import { getUsers, getUserById } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { createCourse } from './handlers/create_course';
import { getCourses, getUserCourses, getCourseDetails } from './handlers/get_courses';
import { updateCourse } from './handlers/update_course';
import { enrollInCourse } from './handlers/enroll_in_course';
import { createLearningMaterial } from './handlers/create_learning_material';
import { getCourseLearningMaterials } from './handlers/get_learning_materials';
import { createAssignment } from './handlers/create_assignment';
import { getCourseAssignments } from './handlers/get_assignments';
import { createAssignmentSubmission } from './handlers/create_assignment_submission';
import { gradeAssignmentSubmission } from './handlers/grade_assignment_submission';
import { getAssignmentSubmissions, getStudentSubmissions } from './handlers/get_assignment_submissions';
import { createPortfolioProject } from './handlers/create_portfolio_project';
import { getStudentPortfolio, getPublicPortfolioProjects } from './handlers/get_portfolio_projects';
import { getDashboardData } from './handlers/get_dashboard_data';
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Auth procedures
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => authenticateUser(input)),

  // User management procedures
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  getUserById: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserById(input.userId)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Course management procedures
  createCourse: publicProcedure
    .input(createCourseInputSchema)
    .mutation(({ input }) => createCourse(input)),

  getCourses: publicProcedure
    .query(() => getCourses()),

  getUserCourses: publicProcedure
    .input(getUserCoursesInputSchema)
    .query(({ input }) => getUserCourses(input)),

  getCourseDetails: publicProcedure
    .input(getCourseDetailsInputSchema)
    .query(({ input }) => getCourseDetails(input)),

  updateCourse: publicProcedure
    .input(updateCourseInputSchema)
    .mutation(({ input }) => updateCourse(input)),

  enrollInCourse: publicProcedure
    .input(enrollInCourseInputSchema)
    .mutation(({ input }) => enrollInCourse(input)),

  // Learning materials procedures
  createLearningMaterial: publicProcedure
    .input(createLearningMaterialInputSchema)
    .mutation(({ input }) => createLearningMaterial(input)),

  getCourseLearningMaterials: publicProcedure
    .input(z.object({ courseId: z.number() }))
    .query(({ input }) => getCourseLearningMaterials(input.courseId)),

  // Assignment procedures
  createAssignment: publicProcedure
    .input(createAssignmentInputSchema)
    .mutation(({ input }) => createAssignment(input)),

  getCourseAssignments: publicProcedure
    .input(z.object({ courseId: z.number() }))
    .query(({ input }) => getCourseAssignments(input.courseId)),

  // Assignment submission procedures
  createAssignmentSubmission: publicProcedure
    .input(createAssignmentSubmissionInputSchema)
    .mutation(({ input }) => createAssignmentSubmission(input)),

  gradeAssignmentSubmission: publicProcedure
    .input(gradeAssignmentSubmissionInputSchema)
    .mutation(({ input }) => gradeAssignmentSubmission(input)),

  getAssignmentSubmissions: publicProcedure
    .input(z.object({ assignmentId: z.number() }))
    .query(({ input }) => getAssignmentSubmissions(input.assignmentId)),

  getStudentSubmissions: publicProcedure
    .input(z.object({ studentId: z.number() }))
    .query(({ input }) => getStudentSubmissions(input.studentId)),

  // Portfolio procedures
  createPortfolioProject: publicProcedure
    .input(createPortfolioProjectInputSchema)
    .mutation(({ input }) => createPortfolioProject(input)),

  getStudentPortfolio: publicProcedure
    .input(getStudentPortfolioInputSchema)
    .query(({ input }) => getStudentPortfolio(input)),

  getPublicPortfolioProjects: publicProcedure
    .query(() => getPublicPortfolioProjects()),

  // Dashboard procedures
  getDashboardData: publicProcedure
    .input(z.object({
      userId: z.number(),
      role: userRoleEnum
    }))
    .query(({ input }) => getDashboardData(input.userId, input.role)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`CreativaHub LMS TRPC server listening at port: ${port}`);
}

start();