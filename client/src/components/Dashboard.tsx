import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { StudentDashboard } from '@/components/StudentDashboard';
import { TeacherDashboard } from '@/components/TeacherDashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import { CourseManagement } from '@/components/CourseManagement';
import { UserManagement } from '@/components/UserManagement';
import { StudentPortfolio } from '@/components/StudentPortfolio';
import { AssignmentManagement } from '@/components/AssignmentManagement';
import type { User } from '../../../server/src/schema';
import type { DashboardData } from '../../../server/src/handlers/get_dashboard_data';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export type ViewType = 
  | 'dashboard' 
  | 'courses' 
  | 'assignments' 
  | 'portfolio' 
  | 'users'
  | 'learning-materials';

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const data = await trpc.getDashboardData.query({
        userId: user.id,
        role: user.role
      });
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, user.role]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const renderMainContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        switch (user.role) {
          case 'student':
            return <StudentDashboard user={user} data={dashboardData} />;
          case 'teacher':
            return <TeacherDashboard user={user} data={dashboardData} />;
          case 'admin':
            return <AdminDashboard user={user} data={dashboardData} />;
          default:
            return <div>Role tidak dikenali</div>;
        }
      case 'courses':
        return <CourseManagement user={user} />;
      case 'assignments':
        return <AssignmentManagement user={user} />;
      case 'portfolio':
        return user.role === 'student' ? (
          <StudentPortfolio studentId={user.id} />
        ) : (
          <div>Akses ditolak</div>
        );
      case 'users':
        return user.role === 'admin' ? (
          <UserManagement />
        ) : (
          <div>Akses ditolak</div>
        );
      default:
        return <div>Halaman tidak ditemukan</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        user={user}
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto p-6">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
}