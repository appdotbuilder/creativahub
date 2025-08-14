import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import type { User, Course, Assignment, PortfolioProject } from '../../../server/src/schema';
import type { DashboardData } from '../../../server/src/handlers/get_dashboard_data';

interface StudentDashboardProps {
  user: User;
  data: DashboardData;
}

export function StudentDashboard({ user, data }: StudentDashboardProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<Assignment[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStudentData = useCallback(async () => {
    try {
      // Load user courses
      const userCoursesData = await trpc.getUserCourses.query({
        user_id: user.id,
        role: user.role
      });
      setCourses(userCoursesData);

      // Load portfolio projects
      const portfolioData = await trpc.getStudentPortfolio.query({
        student_id: user.id
      });
      setPortfolioProjects(portfolioData);

      // Load recent assignments from all courses
      const assignmentPromises = userCoursesData.map((course: Course) =>
        trpc.getCourseAssignments.query({ courseId: course.id })
      );
      const allAssignments = await Promise.all(assignmentPromises);
      const flatAssignments = allAssignments.flat();
      setRecentAssignments(flatAssignments.slice(0, 5)); // Show only 5 most recent
    } catch (error) {
      console.error('Failed to load student data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, user.role]);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">
          Selamat datang, {user.full_name}! 👋
        </h1>
        <p className="text-purple-100">
          Siap untuk mengembangkan kreativitas Anda hari ini?
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kursus Diikuti</CardTitle>
            <span className="text-2xl">📚</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {data.enrolledCourses || courses.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Total kursus aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tugas Aktif</CardTitle>
            <span className="text-2xl">📝</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {data.activeAssignments || recentAssignments.filter(a => a.status === 'published').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Belum dikerjakan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tugas Selesai</CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.completedAssignments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Telah dikumpulkan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyek Portofolio</CardTitle>
            <span className="text-2xl">🎨</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {data.portfolioProjects || portfolioProjects.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Karya kreatif
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              📚 Kursus Terbaru
            </CardTitle>
            <CardDescription>
              Kursus yang sedang Anda ikuti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {courses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Belum ada kursus yang diikuti
                </p>
              ) : (
                courses.slice(0, 3).map((course: Course) => (
                  <div key={course.id} className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🎓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{course.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {course.description || 'Deskripsi tidak tersedia'}
                      </p>
                      <div className="mt-2">
                        <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                          {course.status === 'published' ? 'Aktif' : 'Draft'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {courses.length > 3 && (
                <Button variant="outline" size="sm" className="w-full">
                  Lihat Semua Kursus
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              📝 Tugas Terbaru
            </CardTitle>
            <CardDescription>
              Tugas yang perlu diselesaikan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Tidak ada tugas terbaru
                </p>
              ) : (
                recentAssignments.map((assignment: Assignment) => (
                  <div key={assignment.id} className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{assignment.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {assignment.due_date ? (
                          <>Deadline: {assignment.due_date.toLocaleDateString('id-ID')}</>
                        ) : (
                          'Tidak ada deadline'
                        )}
                      </p>
                      <div className="mt-2">
                        <Badge variant={
                          assignment.status === 'published' ? 'default' : 
                          assignment.status === 'draft' ? 'secondary' : 'outline'
                        }>
                          {assignment.status === 'published' ? 'Aktif' : 
                           assignment.status === 'draft' ? 'Draft' : 'Ditutup'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Nilai Max: {assignment.max_score}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Aksi Cepat</CardTitle>
          <CardDescription>
            Fitur yang sering digunakan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <span className="text-2xl">📚</span>
              <span className="text-sm">Lihat Kursus</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <span className="text-2xl">📝</span>
              <span className="text-sm">Kerjakan Tugas</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <span className="text-2xl">🎨</span>
              <span className="text-sm">Kelola Portofolio</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <span className="text-2xl">📊</span>
              <span className="text-sm">Lihat Nilai</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}