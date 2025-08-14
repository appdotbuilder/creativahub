import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { PortfolioProject, CreatePortfolioProjectInput } from '../../../server/src/schema';

interface StudentPortfolioProps {
  studentId: number;
}

export function StudentPortfolio({ studentId }: StudentPortfolioProps) {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const [formData, setFormData] = useState<CreatePortfolioProjectInput>({
    student_id: studentId,
    title: '',
    description: null,
    project_url: null,
    thumbnail_url: null,
    tags: null,
    is_public: true
  });

  const loadProjects = useCallback(async () => {
    try {
      const portfolioData = await trpc.getStudentPortfolio.query({
        student_id: studentId
      });
      setProjects(portfolioData);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    try {
      const newProject = await trpc.createPortfolioProject.mutate(formData);
      setProjects((prev: PortfolioProject[]) => [newProject, ...prev]);
      setFormData({
        student_id: studentId,
        title: '',
        description: null,
        project_url: null,
        thumbnail_url: null,
        tags: null,
        is_public: true
      });
      setCreateSuccess(true);
      setTimeout(() => {
        setIsCreateDialogOpen(false);
        setCreateSuccess(false);
      }, 1500);
    } catch (error) {
      setCreateError('Gagal membuat proyek portofolio. Silakan coba lagi.');
      console.error('Failed to create portfolio project:', error);
    } finally {
      setIsCreating(false);
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
          <h1 className="text-3xl font-bold text-gray-900">🎨 Portofolio Saya</h1>
          <p className="text-gray-600 mt-2">
            Kumpulkan dan kelola karya kreatif Anda
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              ➕ Tambah Proyek
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Tambah Proyek Baru</DialogTitle>
              <DialogDescription>
                Tambahkan karya kreatif Anda ke portofolio
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProject}>
              <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
                {createError && (
                  <Alert variant="destructive">
                    <AlertDescription>{createError}</AlertDescription>
                  </Alert>
                )}
                
                {createSuccess && (
                  <Alert className="border-green-200 bg-green-50 text-green-800">
                    <AlertDescription>✅ Proyek berhasil ditambahkan!</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="title">Judul Proyek *</Label>
                  <Input
                    id="title"
                    placeholder="Masukkan judul proyek"
                    value={formData.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreatePortfolioProjectInput) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    placeholder="Ceritakan tentang proyek ini..."
                    value={formData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData((prev: CreatePortfolioProjectInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="project_url">URL Proyek</Label>
                  <Input
                    id="project_url"
                    placeholder="https://example.com/project"
                    value={formData.project_url || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreatePortfolioProjectInput) => ({
                        ...prev,
                        project_url: e.target.value || null
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Link ke proyek online (GitHub, Behance, YouTube, dll.)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="thumbnail_url">URL Thumbnail</Label>
                  <Input
                    id="thumbnail_url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.thumbnail_url || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreatePortfolioProjectInput) => ({
                        ...prev,
                        thumbnail_url: e.target.value || null
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Gambar preview untuk proyek Anda
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    placeholder="web design, ilustrasi, video editing"
                    value={formData.tags || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreatePortfolioProjectInput) => ({
                        ...prev,
                        tags: e.target.value || null
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Pisahkan dengan koma untuk multiple tags
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_public"
                    checked={formData.is_public ?? false}
                    onCheckedChange={(checked) =>
                      setFormData((prev: CreatePortfolioProjectInput) => ({
                        ...prev,
                        is_public: checked
                      }))
                    }
                  />
                  <Label htmlFor="is_public">Tampilkan secara publik</Label>
                  <p className="text-xs text-muted-foreground ml-2">
                    Proyek akan terlihat oleh pengguna lain
                  </p>
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
                  {isCreating ? 'Menyimpan...' : 'Simpan Proyek'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proyek</CardTitle>
            <span className="text-2xl">🎨</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{projects.length}</div>
            <p className="text-xs text-muted-foreground">Karya dalam portofolio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyek Publik</CardTitle>
            <span className="text-2xl">👁️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {projects.filter((p: PortfolioProject) => p.is_public).length}
            </div>
            <p className="text-xs text-muted-foreground">Terlihat oleh semua</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyek Privat</CardTitle>
            <span className="text-2xl">🔒</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {projects.filter((p: PortfolioProject) => !p.is_public).length}
            </div>
            <p className="text-xs text-muted-foreground">Hanya untuk Anda</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Portofolio Masih Kosong
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Mulai membangun portofolio dengan menambahkan karya kreatif pertama Anda.
              Tunjukkan kemampuan dan kreativitas Anda!
            </p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              ➕ Tambah Proyek Pertama
            </Button>
          </div>
        ) : (
          projects.map((project: PortfolioProject) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow overflow-hidden">
              <div className="relative">
                {project.thumbnail_url ? (
                  <img 
                    src={project.thumbnail_url} 
                    alt={project.title}
                    className="w-full h-48 object-cover"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="%23f3f4f6"/><text x="200" y="100" font-family="Arial" font-size="16" fill="%23374151" text-anchor="middle" dominant-baseline="central">🎨 Tidak ada gambar</text></svg>';
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                    <span className="text-4xl">🎨</span>
                  </div>
                )}
                
                <div className="absolute top-2 right-2">
                  <Badge variant={project.is_public ? 'default' : 'secondary'}>
                    {project.is_public ? '👁️ Publik' : '🔒 Privat'}
                  </Badge>
                </div>
              </div>
              
              <CardHeader>
                <CardTitle className="line-clamp-2 text-lg">{project.title}</CardTitle>
                {project.description && (
                  <CardDescription className="line-clamp-3">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                {project.tags && (
                  <div className="flex flex-wrap gap-1">
                    {project.tags.split(',').map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  {project.project_url && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => window.open(project.project_url!, '_blank')}
                    >
                      🔗 Lihat Proyek
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1">
                    ✏️ Edit
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>Dibuat: {project.created_at.toLocaleDateString('id-ID')}</p>
                  {project.updated_at.getTime() !== project.created_at.getTime() && (
                    <p>Diperbarui: {project.updated_at.toLocaleDateString('id-ID')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}