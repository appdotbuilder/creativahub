import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import type { User, Course } from '../../../server/src/schema';
import type { DashboardData } from '../../../server/src/handlers/get_dashboard_data';

interface AdminDashboardProps {
  user: User;
  data: DashboardData;
}

export function AdminDashboard({ user, data }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAdminData = useCallback(async () => {
    try {
      // Load all users
      const usersData = await trpc.getUsers.query();
      setUsers(usersData);

      // Load all courses
      const coursesData = await trpc.getCourses.query();
      setCourses(coursesData);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const studentCount = users.filter((u: User) => u.role === 'student').length;
  const teacherCount = users.filter((u: User) => u.role === 'teacher').length;
  const activeUsers = users.filter((u: User) => u.is_active).length;
  const activeCourses = courses.filter((c: Course) => c.status === 'published').length;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">
          Selamat datang, {user.full_name}! 👨‍💼
        </h1>
        <p className="text-red-100">
          Kelola platform CreativaHub dengan mudah dan efisien
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
            <span className="text-2xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.totalUsers || users.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeUsers} aktif dari {users.length} pengguna
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kursus</CardTitle>
            <span className="text-2xl">📚</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data.totalCourses || courses.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeCourses} aktif dari {courses.length} kursus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Siswa</CardTitle>
            <span className="text-2xl">👨‍🎓</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.totalStudents || studentCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Siswa terdaftar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Guru</CardTitle>
            <span className="text-2xl">👨‍🏫</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {data.totalTeachers || teacherCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Guru terdaftar
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              👥 Pengguna Terbaru
            </CardTitle>
            <CardDescription>
              Pengguna yang baru terdaftar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.slice(0, 5).map((user: User) => (
                <div key={user.id} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">
                      {user.role === 'student' ? '👨‍🎓' : 
                       user.role === 'teacher' ? '👨‍🏫' : '👨‍💼'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{user.full_name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {user.role === 'student' ? 'Siswa' : 
                       user.role === 'teacher' ? 'Guru' : 'Admin'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              📚 Kursus Terbaru
            </CardTitle>
            <CardDescription>
              Kursus yang baru dibuat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {courses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Belum ada kursus yang dibuat
                </p>
              ) : (
                courses.slice(0, 5).map((course: Course) => (
                  <div key={course.id} className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg">🎓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{course.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {course.description || 'Deskripsi tidak tersedia'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        course.status === 'published' ? 'default' : 
                        course.status === 'draft' ? 'secondary' : 'outline'
                      }>
                        {course.status === 'published' ? 'Aktif' : 
                         course.status === 'draft' ? 'Draft' : 'Arsip'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            🔧 Status Sistem
          </CardTitle>
          <CardDescription>
            Kesehatan platform CreativaHub
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pengguna Aktif</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round((activeUsers / users.length) * 100) || 0}%
                </span>
              </div>
              <Progress 
                value={Math.round((activeUsers / users.length) * 100) || 0} 
                className="h-2"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Kursus Aktif</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round((activeCourses / courses.length) * 100) || 0}%
                </span>
              </div>
              <Progress 
                value={Math.round((activeCourses / courses.length) * 100) || 0} 
                className="h-2"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Rasio Guru:Siswa</span>
                <span className="text-sm text-muted-foreground">
                  1:{Math.round(studentCount / (teacherCount || 1))}
                </span>
              </div>
              <Progress 
                value={Math.min((teacherCount / studentCount) * 100, 100) || 0} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Aksi Cepat</CardTitle>
          <CardDescription>
            Fitur administrasi utama
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <span className="text-2xl">👤</span>
              <span className="text-sm">Kelola Pengguna</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <span className="text-2xl">📚</span>
              <span className="text-sm">Kelola Kursus</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <span className="text-2xl">📊</span>
              <span className="text-sm">Lihat Laporan</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <span className="text-2xl">⚙️</span>
              <span className="text-sm">Pengaturan</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}