import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, Course, CreateCourseInput } from '../../../server/src/schema';

interface CourseManagementProps {
  user: User;
}

export function CourseManagement({ user }: CourseManagementProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const [formData, setFormData] = useState<CreateCourseInput>({
    title: '',
    description: null,
    teacher_id: user.id,
    thumbnail_url: null,
    status: 'draft'
  });

  const loadCourses = useCallback(async () => {
    try {
      if (user.role === 'admin') {
        // Admin can see all courses
        const allCourses = await trpc.getCourses.query();
        setCourses(allCourses);
      } else {
        // Teachers and students see relevant courses
        const userCourses = await trpc.getUserCourses.query({
          user_id: user.id,
          role: user.role
        });
        setCourses(userCourses);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, user.role]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    try {
      const newCourse = await trpc.createCourse.mutate(formData);
      setCourses((prev: Course[]) => [newCourse, ...prev]);
      setFormData({
        title: '',
        description: null,
        teacher_id: user.id,
        thumbnail_url: null,
        status: 'draft'
      });
      setCreateSuccess(true);
      setTimeout(() => {
        setIsCreateDialogOpen(false);
        setCreateSuccess(false);
      }, 1500);
    } catch (error) {
      setCreateError('Gagal membuat kursus. Silakan coba lagi.');
      console.error('Failed to create course:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEnrollInCourse = async (courseId: number) => {
    if (user.role !== 'student') return;
    
    try {
      await trpc.enrollInCourse.mutate({
        course_id: courseId,
        student_id: user.id
      });
      // Refresh courses to show enrollment
      loadCourses();
    } catch (error) {
      console.error('Failed to enroll in course:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📚 Kelola Kursus</h1>
          <p className="text-gray-600 mt-2">
            {user.role === 'student' && 'Jelajahi dan ikuti kursus yang tersedia'}
            {user.role === 'teacher' && 'Kelola kursus yang Anda ajar'}
            {user.role === 'admin' && 'Kelola semua kursus di platform'}
          </p>
        </div>
        
        {(user.role === 'teacher' || user.role === 'admin') && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                ➕ Buat Kursus Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Buat Kursus Baru</DialogTitle>
                <DialogDescription>
                  Buat kursus baru untuk siswa Anda
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCourse}>
                <div className="space-y-4 py-4">
                  {createError && (
                    <Alert variant="destructive">
                      <AlertDescription>{createError}</AlertDescription>
                    </Alert>
                  )}
                  
                  {createSuccess && (
                    <Alert className="border-green-200 bg-green-50 text-green-800">
                      <AlertDescription>✅ Kursus berhasil dibuat!</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">Judul Kursus *</Label>
                    <Input
                      id="title"
                      placeholder="Masukkan judul kursus"
                      value={formData.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateCourseInput) => ({ ...prev, title: e.target.value }))
                      }
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Deskripsi</Label>
                    <Textarea
                      id="description"
                      placeholder="Deskripsi kursus (opsional)"
                      value={formData.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setFormData((prev: CreateCourseInput) => ({
                          ...prev,
                          description: e.target.value || null
                        }))
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail_url">URL Thumbnail</Label>
                    <Input
                      id="thumbnail_url"
                      placeholder="https://example.com/image.jpg (opsional)"
                      value={formData.thumbnail_url || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateCourseInput) => ({
                          ...prev,
                          thumbnail_url: e.target.value || null
                        }))
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status || 'draft'}
                      onValueChange={(value) =>
                        setFormData((prev: CreateCourseInput) => ({
                          ...prev,
                          status: value as 'draft' | 'published' | 'archived'
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Dipublikasikan</SelectItem>
                        <SelectItem value="archived">Diarsipkan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={isCreating}
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isCreating || !formData.title.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isCreating ? 'Membuat...' : 'Buat Kursus'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {user.role === 'student' && 'Belum ada kursus tersedia'}
              {user.role === 'teacher' && 'Belum ada kursus yang dibuat'}
              {user.role === 'admin' && 'Belum ada kursus di platform'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {user.role === 'student' && 'Kursus akan muncul di sini ketika guru mulai membuat konten pembelajaran.'}
              {user.role === 'teacher' && 'Mulai dengan membuat kursus pertama Anda untuk siswa.'}
              {user.role === 'admin' && 'Kursus akan muncul ketika guru mulai membuat konten.'}
            </p>
          </div>
        ) : (
          courses.map((course: Course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="line-clamp-2 text-lg">{course.title}</CardTitle>
                  <Badge variant={
                    course.status === 'published' ? 'default' : 
                    course.status === 'draft' ? 'secondary' : 'outline'
                  }>
                    {course.status === 'published' ? 'Aktif' : 
                     course.status === 'draft' ? 'Draft' : 'Arsip'}
                  </Badge>
                </div>
                {course.description && (
                  <CardDescription className="line-clamp-3">
                    {course.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {course.thumbnail_url && (
                    <img 
                      src={course.thumbnail_url} 
                      alt={course.title}
                      className="w-full h-32 object-cover rounded-lg"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Dibuat: {course.created_at.toLocaleDateString('id-ID')}</p>
                    {course.updated_at.getTime() !== course.created_at.getTime() && (
                      <p>Diperbarui: {course.updated_at.toLocaleDateString('id-ID')}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {user.role === 'student' && course.status === 'published' && (
                      <Button 
                        size="sm" 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleEnrollInCourse(course.id)}
                      >
                        📚 Ikuti Kursus
                      </Button>
                    )}
                    
                    {(user.role === 'teacher' || user.role === 'admin') && (
                      <>
                        <Button size="sm" variant="outline" className="flex-1">
                          ✏️ Edit
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          📝 Tugas
                        </Button>
                      </>
                    )}
                    
                    <Button size="sm" variant="outline" className="flex-1">
                      👁️ Lihat
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}