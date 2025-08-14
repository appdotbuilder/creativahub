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
import type { User, Course, Assignment, AssignmentSubmission, CreateAssignmentInput } from '../../../server/src/schema';

interface AssignmentManagementProps {
  user: User;
}

export function AssignmentManagement({ user }: AssignmentManagementProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const [formData, setFormData] = useState<CreateAssignmentInput>({
    course_id: 0,
    title: '',
    description: null,
    due_date: null,
    max_score: 100,
    status: 'draft'
  });

  const loadData = useCallback(async () => {
    try {
      // Load user courses first
      const userCoursesData = await trpc.getUserCourses.query({
        user_id: user.id,
        role: user.role
      });
      setCourses(userCoursesData);

      // Load assignments from user's courses
      if (userCoursesData.length > 0) {
        const assignmentPromises = userCoursesData.map((course: Course) =>
          trpc.getCourseAssignments.query({ courseId: course.id })
        );
        const allAssignments = await Promise.all(assignmentPromises);
        const flatAssignments = allAssignments.flat();
        setAssignments(flatAssignments);

        // Load submissions if student
        if (user.role === 'student') {
          const studentSubmissions = await trpc.getStudentSubmissions.query({
            studentId: user.id
          });
          setSubmissions(studentSubmissions);
        }
      }
    } catch (error) {
      console.error('Failed to load assignment data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, user.role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    try {
      const newAssignment = await trpc.createAssignment.mutate(formData);
      setAssignments((prev: Assignment[]) => [newAssignment, ...prev]);
      setFormData({
        course_id: 0,
        title: '',
        description: null,
        due_date: null,
        max_score: 100,
        status: 'draft'
      });
      setCreateSuccess(true);
      setTimeout(() => {
        setIsCreateDialogOpen(false);
        setCreateSuccess(false);
      }, 1500);
    } catch (error) {
      setCreateError('Gagal membuat tugas. Silakan coba lagi.');
      console.error('Failed to create assignment:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmitAssignment = async (assignmentId: number) => {
    if (user.role !== 'student') return;

    try {
      await trpc.createAssignmentSubmission.mutate({
        assignment_id: assignmentId,
        student_id: user.id,
        submission_text: 'Tugas dikumpulkan melalui platform' // Placeholder
      });
      // Refresh data
      loadData();
    } catch (error) {
      console.error('Failed to submit assignment:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">📝 Kelola Tugas</h1>
          <p className="text-gray-600 mt-2">
            {user.role === 'student' && 'Lihat dan kerjakan tugas yang diberikan'}
            {user.role === 'teacher' && 'Kelola tugas untuk siswa Anda'}
            {user.role === 'admin' && 'Kelola semua tugas di platform'}
          </p>
        </div>
        
        {(user.role === 'teacher' || user.role === 'admin') && courses.length > 0 && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                ➕ Buat Tugas Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Buat Tugas Baru</DialogTitle>
                <DialogDescription>
                  Buat tugas baru untuk siswa Anda
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAssignment}>
                <div className="space-y-4 py-4">
                  {createError && (
                    <Alert variant="destructive">
                      <AlertDescription>{createError}</AlertDescription>
                    </Alert>
                  )}
                  
                  {createSuccess && (
                    <Alert className="border-green-200 bg-green-50 text-green-800">
                      <AlertDescription>✅ Tugas berhasil dibuat!</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="course_id">Kursus *</Label>
                    <Select
                      value={formData.course_id.toString()}
                      onValueChange={(value) =>
                        setFormData((prev: CreateAssignmentInput) => ({
                          ...prev,
                          course_id: parseInt(value)
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kursus" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course: Course) => (
                          <SelectItem key={course.id} value={course.id.toString()}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">Judul Tugas *</Label>
                    <Input
                      id="title"
                      placeholder="Masukkan judul tugas"
                      value={formData.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateAssignmentInput) => ({ ...prev, title: e.target.value }))
                      }
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Deskripsi</Label>
                    <Textarea
                      id="description"
                      placeholder="Deskripsi tugas dan instruksi"
                      value={formData.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setFormData((prev: CreateAssignmentInput) => ({
                          ...prev,
                          description: e.target.value || null
                        }))
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Tanggal Deadline</Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={formData.due_date ? new Date(formData.due_date.getTime() - formData.due_date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateAssignmentInput) => ({
                          ...prev,
                          due_date: e.target.value ? new Date(e.target.value) : null
                        }))
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max_score">Nilai Maksimal *</Label>
                    <Input
                      id="max_score"
                      type="number"
                      min="1"
                      max="1000"
                      value={formData.max_score}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateAssignmentInput) => ({
                          ...prev,
                          max_score: parseInt(e.target.value) || 100
                        }))
                      }
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status || 'draft'}
                      onValueChange={(value) =>
                        setFormData((prev: CreateAssignmentInput) => ({
                          ...prev,
                          status: value as 'draft' | 'published' | 'closed'
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Dipublikasikan</SelectItem>
                        <SelectItem value="closed">Ditutup</SelectItem>
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
                    disabled={isCreating || !formData.title.trim() || formData.course_id === 0}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isCreating ? 'Membuat...' : 'Buat Tugas'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {assignments.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {user.role === 'student' && 'Belum ada tugas tersedia'}
              {(user.role === 'teacher' || user.role === 'admin') && 'Belum ada tugas yang dibuat'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {user.role === 'student' && 'Tugas akan muncul di sini ketika guru memberikan tugas.'}
              {(user.role === 'teacher' || user.role === 'admin') && 'Mulai dengan membuat tugas pertama untuk siswa.'}
            </p>
          </div>
        ) : (
          assignments.map((assignment: Assignment) => {
            const courseName = courses.find((c: Course) => c.id === assignment.course_id)?.title || 'Unknown Course';
            const userSubmission = submissions.find((s: AssignmentSubmission) => s.assignment_id === assignment.id);
            const isOverdue = assignment.due_date && new Date() > assignment.due_date;
            
            return (
              <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-2 text-lg">{assignment.title}</CardTitle>
                      <CardDescription className="mt-1">
                        📚 {courseName}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      assignment.status === 'published' ? 'default' : 
                      assignment.status === 'draft' ? 'secondary' : 'outline'
                    }>
                      {assignment.status === 'published' ? 'Aktif' : 
                       assignment.status === 'draft' ? 'Draft' : 'Ditutup'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {assignment.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {assignment.description}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Nilai Maksimal</p>
                      <p className="text-lg font-bold text-purple-600">{assignment.max_score}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Deadline</p>
                      <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {assignment.due_date ? (
                          <>
                            {assignment.due_date.toLocaleDateString('id-ID')}
                            <br />
                            <span className="text-xs">
                              {assignment.due_date.toLocaleTimeString('id-ID', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </>
                        ) : (
                          'Tidak ada deadline'
                        )}
                      </p>
                    </div>
                  </div>

                  {user.role === 'student' && userSubmission && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Status Pengumpulan:</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant={
                          userSubmission.status === 'graded' ? 'default' :
                          userSubmission.status === 'submitted' ? 'secondary' : 'outline'
                        }>
                          {userSubmission.status === 'graded' ? 'Sudah Dinilai' :
                           userSubmission.status === 'submitted' ? 'Sudah Dikumpulkan' : 'Draft'}
                        </Badge>
                        {userSubmission.status === 'graded' && userSubmission.score !== null && (
                          <span className="text-lg font-bold text-green-600">
                            {userSubmission.score}/{assignment.max_score}
                          </span>
                        )}
                      </div>
                      {userSubmission.feedback && (
                        <p className="text-sm text-blue-700 mt-2">
                          <strong>Feedback:</strong> {userSubmission.feedback}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {user.role === 'student' && assignment.status === 'published' && !userSubmission && (
                      <Button 
                        size="sm" 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleSubmitAssignment(assignment.id)}
                        disabled={!!isOverdue}
                      >
                        📤 {isOverdue ? 'Terlambat' : 'Kumpulkan'}
                      </Button>
                    )}
                    
                    {(user.role === 'teacher' || user.role === 'admin') && (
                      <>
                        <Button size="sm" variant="outline" className="flex-1">
                          ✏️ Edit
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          📊 Penilaian
                        </Button>
                      </>
                    )}
                    
                    <Button size="sm" variant="outline" className="flex-1">
                      👁️ Detail
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <p>Dibuat: {assignment.created_at.toLocaleDateString('id-ID')}</p>
                    {assignment.updated_at.getTime() !== assignment.created_at.getTime() && (
                      <p>Diperbarui: {assignment.updated_at.toLocaleDateString('id-ID')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}