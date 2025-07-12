import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  CreditCard, 
  Router, 
  MapPin, 
  Package, 
  MessageSquare,
  BarChart3,
  User,
  Network,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [logoError, setLogoError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Router', href: '/routers', icon: Router },
    { name: 'Wilayah', href: '/areas', icon: MapPin },
    { name: 'ODP', href: '/odp', icon: Network },
    { name: 'Paket', href: '/packages', icon: Package },
    { name: 'Pelanggan', href: '/customers', icon: Users },
    { name: 'Pesan', href: '/messages', icon: MessageSquare },
    { name: 'Transaksi', href: '/transactions', icon: CreditCard },
  ];

  const handleLogout = () => {
    logout();
  };

  const handleLogoError = () => {
    setLogoError(true);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Toggle Sidebar Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              
              <div className="flex items-center space-x-2">
                {/* Logo */}
                {!logoError ? (
                  <img 
                    src="/logo.png" 
                    alt="Latansa Networks Logo" 
                    className="w-8 h-8 object-contain"
                    onError={handleLogoError}
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">LA</span>
                  </div>
                )}
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Latansa Billing System</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">{user?.username || 'Admin'}</p>
                  <p className="text-gray-500 dark:text-gray-400">ADMIN</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white dark:bg-gray-800 shadow-sm transition-all duration-300 ease-in-out overflow-hidden`}>
          <nav className="p-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-hidden">
          <Card className="h-full overflow-auto dark:bg-gray-800 dark:border-gray-700">
            <div className="p-6">
              {children}
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Layout;