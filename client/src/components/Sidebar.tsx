import { Button } from '@/components/ui/button';
// Simple utility function for conditional classnames
const cn = (...classes: (string | undefined | null | boolean)[]) => {
  return classes.filter(Boolean).join(' ');
};
import type { User } from '../../../server/src/schema';
import type { ViewType } from '@/components/Dashboard';

interface SidebarProps {
  user: User;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

interface MenuItem {
  id: ViewType;
  label: string;
  icon: string;
  roles: string[];
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    roles: ['student', 'teacher', 'admin']
  },
  {
    id: 'courses',
    label: 'Kursus',
    icon: '📚',
    roles: ['student', 'teacher', 'admin']
  },
  {
    id: 'assignments',
    label: 'Tugas',
    icon: '📝',
    roles: ['student', 'teacher', 'admin']
  },
  {
    id: 'portfolio',
    label: 'Portofolio',
    icon: '🎨',
    roles: ['student']
  },
  {
    id: 'users',
    label: 'Pengguna',
    icon: '👥',
    roles: ['admin']
  }
];

export function Sidebar({ user, currentView, onViewChange }: SidebarProps) {
  const availableMenuItems = menuItems.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <nav className="space-y-2">
          {availableMenuItems.map((item) => (
            <Button
              key={item.id}
              variant={currentView === item.id ? 'default' : 'ghost'}
              className={cn(
                'w-full justify-start text-left font-normal',
                currentView === item.id
                  ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                  : 'hover:bg-gray-100'
              )}
              onClick={() => onViewChange(item.id)}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Button>
          ))}
        </nav>
      </div>
      
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-xs text-purple-600 font-medium">
            CreativaHub LMS v1.0
          </p>
          <p className="text-xs text-purple-500 mt-1">
            Platform Pembelajaran Kreatif
          </p>
        </div>
      </div>
    </aside>
  );
}