
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Router, 
  MapPin, 
  CreditCard, 
  TrendingUp, 
  AlertCircle,
  DollarSign,
  UserPlus,
  UserMinus,
  Wifi,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Zap,
  Signal,
  Globe
} from 'lucide-react';

import { useCustomers } from '@/hooks/useCustomers';
import { useAreas } from '@/hooks/useAreas';
import { useRouters } from '@/hooks/useRouters';
import { usePackages } from '@/hooks/usePackages';
import { useQuery } from '@tanstack/react-query';
import { api, getTransactions } from '@/utils/api';
import { getCurrentJakartaTime, formatDateTimeForDisplay } from '../utils/timezone';

const Dashboard = () => {
  const { customers } = useCustomers();
  const { areas } = useAreas();
  const { routers } = useRouters();
  const { packages } = usePackages();
  
  const [currentTime, setCurrentTime] = useState(getCurrentJakartaTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentJakartaTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch transactions for revenue calculation
  const { data: transactionsResponse } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  });

  // Extract transactions array from API response
  const transactions = transactionsResponse?.data || [];

  // Calculate metrics using correct status fields
  const totalCustomers = customers.length;
  
  // Active customers: those with 'lunas' billing status and 'active' service status
  const activeCustomers = customers.filter(c => 
    c.billingStatus === 'lunas' && c.serviceStatus === 'active'
  ).length;
  
  // Suspended customers: those with 'suspended' status or 'suspend' billing status
  const suspendedCustomers = customers.filter(c => 
    c.status === 'suspended' || c.billingStatus === 'suspend'
  ).length;
  
  // Unpaid customers: those with 'belum_lunas' billing status
  const unpaidCustomers = customers.filter(c => 
    c.billingStatus === 'belum_lunas'
  ).length;
  
  // New installations: those with 'not_installed' installation status
  const newInstallations = customers.filter(c => 
    c.installationStatus === 'not_installed'
  ).length;

  // Installed but inactive: those installed but service not active
  const installedInactive = customers.filter(c => 
    c.installationStatus === 'installed' && c.serviceStatus === 'inactive'
  ).length;

  // Revenue calculations
  const currentMonth = getCurrentJakartaTime().getMonth();
  const currentYear = getCurrentJakartaTime().getFullYear();
  const monthlyTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.createdAt);
    return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
  });
  
  const monthlyRevenue = monthlyTransactions.reduce((sum, t) => {
    // Convert string amount to number (backend returns DECIMAL as string)
    const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : 
                   typeof t.amount === 'number' ? t.amount : 0;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  
  const totalRevenue = transactions.reduce((sum, t) => {
    // Convert string amount to number (backend returns DECIMAL as string)
    const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : 
                   typeof t.amount === 'number' ? t.amount : 0;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  // Package distribution
  const packageStats = packages.map(pkg => ({
    name: pkg.name,
    count: customers.filter(c => c.package === pkg.name).length,
    revenue: customers.filter(c => c.package === pkg.name).length * (pkg.price || 0)
  }));

  // Area coverage
  const areaStats = areas.map(area => ({
    name: area.name,
    customers: customers.filter(c => c.area === area.name).length,
    routers: routers.filter(r => r.area === area.name).length
  }));

  // Recent activities (last 7 days)
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const recentTransactions = transactions.filter(t => new Date(t.createdAt) >= lastWeek);
  const newCustomersThisWeek = customers.filter(c => new Date(c.createdAt || '') >= lastWeek).length;

  // Alerts and notifications
  const alerts = [
    {
      type: 'warning',
      title: 'Pembayaran Tertunggak',
      message: `${unpaidCustomers} pelanggan belum bayar`,
      count: unpaidCustomers,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
    },
    {
      type: 'danger',
      title: 'Pelanggan Suspended',
      message: `${suspendedCustomers} pelanggan di-suspend`,
      count: suspendedCustomers,
      color: 'bg-red-50 border-red-200 text-red-800'
    },
    {
      type: 'info',
      title: 'Instalasi Pending',
      message: `${newInstallations} instalasi menunggu`,
      count: newInstallations,
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    {
      type: 'warning',
      title: 'Terpasang Belum Aktif',
      message: `${installedInactive} pelanggan belum aktif`,
      count: installedInactive,
      color: 'bg-orange-50 border-orange-200 text-orange-800'
    }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard ISP</h1>
          <p className="text-gray-600">Latansa Networks - Monitoring & Analytics</p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-sm text-gray-500">
            {currentTime.toLocaleDateString('id-ID', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <div className="text-lg font-semibold">
            {currentTime.toLocaleTimeString('id-ID', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalCustomers}</div>
                <div className="text-sm text-gray-500">Total Pelanggan</div>
                <div className="text-xs text-green-600">+{newCustomersThisWeek} minggu ini</div>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Customers */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{activeCustomers}</div>
                <div className="text-sm text-gray-500">Pelanggan Aktif</div>
                <div className="text-xs text-gray-600">{totalCustomers > 0 ? Math.round((activeCustomers/totalCustomers)*100) : 0}% dari total</div>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(monthlyRevenue).toLocaleString('id-ID')}
                </div>
                <div className="text-sm text-gray-500">Pendapatan Bulan Ini</div>
                <div className="text-xs text-gray-600">{monthlyTransactions.length} transaksi</div>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-600">
                  Rp. {Math.round(totalRevenue).toLocaleString('id-ID')}
                </div>
                <div className="text-sm text-gray-500">Total Pendapatan Selama ini</div>
                <div className="text-xs text-gray-600">{transactions.length} total transaksi</div>
              </div>
              <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>


      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Customer Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Analitik Pelanggan</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Aktif</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${totalCustomers > 0 ? (activeCustomers/totalCustomers)*100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{activeCustomers}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Suspended</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${totalCustomers > 0 ? (suspendedCustomers/totalCustomers)*100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{suspendedCustomers}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Belum Bayar</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${totalCustomers > 0 ? (unpaidCustomers/totalCustomers)*100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{unpaidCustomers}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Instalasi Baru</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${totalCustomers > 0 ? (newInstallations/totalCustomers)*100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{newInstallations}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Insight Pendapatan</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Pendapatan</span>
                <span className="font-semibold">{Math.round(totalRevenue).toLocaleString('id-ID')}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Bulan Ini</span>
                <span className="font-semibold text-purple-600">{Math.round(monthlyRevenue).toLocaleString('id-ID')}</span>
              </div>
              

              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Transaksi Bulan Ini</span>
                <span className="font-semibold">{monthlyTransactions.length}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Transaksi 7 Hari</span>
                <span className="font-semibold text-green-600">{recentTransactions.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Package Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wifi className="h-5 w-5" />
              <span>Distribusi Paket</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {packageStats.map((pkg, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{pkg.name}</span>
                      <span className="text-sm text-gray-600">{pkg.count} pelanggan</span>
                    </div>
                    <Progress 
                      value={totalCustomers > 0 ? (pkg.count / totalCustomers) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-sm font-semibold">{Math.round(pkg.revenue).toLocaleString('id-ID')}</div>
                    <div className="text-xs text-gray-500">Revenue</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Cakupan Area</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {areaStats.map((area, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{area.name}</span>
                      <span className="text-sm text-gray-600">{area.customers} pelanggan</span>
                    </div>
                    <Progress 
                      value={totalCustomers > 0 ? (area.customers / totalCustomers) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                  <div className="ml-4 text-center">
                    <div className="text-sm font-semibold">{area.routers}</div>
                    <div className="text-xs text-gray-500">Router</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>Peringatan & Notifikasi</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {alerts.map((alert, index) => (
              <div key={index} className={`p-4 rounded-lg border ${alert.color}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{alert.title}</div>
                    <div className="text-xs mt-1">{alert.message}</div>
                  </div>
                  <div className="text-2xl font-bold">{alert.count}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>


    </div>
  );
};

export default Dashboard;
