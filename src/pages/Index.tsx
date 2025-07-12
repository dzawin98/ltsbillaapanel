
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Router, 
  MapPin, 
  Users, 
  Activity, 
  DollarSign, 
  Wifi, 
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  Signal,
  AlertTriangle
} from 'lucide-react';

interface RouterDevice {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
  area: string;
}

interface Area {
  id: string;
  name: string;
  description: string;
  routerCount: number;
  customerCount: number;
}

const Index = () => {
  const [routers, setRouters] = useState<RouterDevice[]>([
    {
      id: '1',
      name: 'Router Utama',
      ipAddress: '192.168.1.1',
      port: 8728,
      username: 'admin',
      password: '****',
      status: 'online',
      lastSeen: '2 minutes ago',
      area: 'Area A'
    },
    {
      id: '2',
      name: 'Router Backup',
      ipAddress: '192.168.1.2',
      port: 8728,
      username: 'admin',
      password: '****',
      status: 'offline',
      lastSeen: '1 hour ago',
      area: 'Area B'
    }
  ]);

  const [areas, setAreas] = useState<Area[]>([
    {
      id: '1',
      name: 'Area A - Central',
      description: 'Area pusat kota dengan coverage utama',
      routerCount: 3,
      customerCount: 150
    },
    {
      id: '2',
      name: 'Area B - North',
      description: 'Area utara kota dengan ekspansi baru',
      routerCount: 2,
      customerCount: 85
    }
  ]);

  const [newRouter, setNewRouter] = useState({
    name: '',
    ipAddress: '',
    port: 8728,
    username: '',
    password: '',
    area: ''
  });

  const [newArea, setNewArea] = useState({
    name: '',
    description: ''
  });

  const [showRouterDialog, setShowRouterDialog] = useState(false);
  const [showAreaDialog, setShowAreaDialog] = useState(false);

  const handleAddRouter = () => {
    if (!newRouter.name || !newRouter.ipAddress || !newRouter.username || !newRouter.password || !newRouter.area) {
      toast.error('Semua field router harus diisi');
      return;
    }

    const router: RouterDevice = {
      id: Date.now().toString(),
      ...newRouter,
      status: 'offline',
      lastSeen: 'Never'
    };

    setRouters([...routers, router]);
    setNewRouter({ name: '', ipAddress: '', port: 8728, username: '', password: '', area: '' });
    setShowRouterDialog(false);
    toast.success('Router berhasil ditambahkan');
  };

  const handleAddArea = () => {
    if (!newArea.name || !newArea.description) {
      toast.error('Nama dan deskripsi area harus diisi');
      return;
    }

    const area: Area = {
      id: Date.now().toString(),
      ...newArea,
      routerCount: 0,
      customerCount: 0
    };

    setAreas([...areas, area]);
    setNewArea({ name: '', description: '' });
    setShowAreaDialog(false);
    toast.success('Area berhasil ditambahkan');
  };

  const testConnection = async (router: RouterDevice) => {
    toast.info(`Testing connection to ${router.name}...`);
    
    // Simulate connection test
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success rate for demo
      
      if (success) {
        setRouters(routers.map(r => 
          r.id === router.id 
            ? { ...r, status: 'online', lastSeen: 'Just now' }
            : r
        ));
        toast.success(`Connection to ${router.name} successful!`);
      } else {
        setRouters(routers.map(r => 
          r.id === router.id 
            ? { ...r, status: 'error', lastSeen: 'Connection failed' }
            : r
        ));
        toast.error(`Failed to connect to ${router.name}`);
      }
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Signal className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <Signal className="h-4 w-4 text-gray-400" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Signal className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'offline':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Wifi className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ISP Management System</h1>
                <p className="text-sm text-gray-600">Kelola router, area, dan pelanggan ISP Anda</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                System Online
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white shadow-sm border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Routers</p>
                <p className="text-3xl font-bold text-gray-900">{routers.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Router className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white shadow-sm border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Areas</p>
                <p className="text-3xl font-bold text-gray-900">{areas.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white shadow-sm border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Online Routers</p>
                <p className="text-3xl font-bold text-gray-900">
                  {routers.filter(r => r.status === 'online').length}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-full">
                <Activity className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white shadow-sm border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-3xl font-bold text-gray-900">
                  {areas.reduce((sum, area) => sum + area.customerCount, 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="routers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="routers" className="flex items-center space-x-2">
              <Router className="h-4 w-4" />
              <span>Routers</span>
            </TabsTrigger>
            <TabsTrigger value="areas" className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Areas</span>
            </TabsTrigger>
          </TabsList>

          {/* Routers Tab */}
          <TabsContent value="routers" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Router Management</h2>
              <Dialog open={showRouterDialog} onOpenChange={setShowRouterDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Router
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Router</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="router-name">Router Name</Label>
                      <Input
                        id="router-name"
                        value={newRouter.name}
                        onChange={(e) => setNewRouter({...newRouter, name: e.target.value})}
                        placeholder="e.g., Router Utama"
                      />
                    </div>
                    <div>
                      <Label htmlFor="router-ip">IP Address</Label>
                      <Input
                        id="router-ip"
                        value={newRouter.ipAddress}
                        onChange={(e) => setNewRouter({...newRouter, ipAddress: e.target.value})}
                        placeholder="192.168.1.1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="router-port">Port</Label>
                      <Input
                        id="router-port"
                        type="number"
                        value={newRouter.port}
                        onChange={(e) => setNewRouter({...newRouter, port: parseInt(e.target.value)})}
                        placeholder="8728"
                      />
                    </div>
                    <div>
                      <Label htmlFor="router-username">Username</Label>
                      <Input
                        id="router-username"
                        value={newRouter.username}
                        onChange={(e) => setNewRouter({...newRouter, username: e.target.value})}
                        placeholder="admin"
                      />
                    </div>
                    <div>
                      <Label htmlFor="router-password">Password</Label>
                      <Input
                        id="router-password"
                        type="password"
                        value={newRouter.password}
                        onChange={(e) => setNewRouter({...newRouter, password: e.target.value})}
                        placeholder="Password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="router-area">Area</Label>
                      <Select value={newRouter.area} onValueChange={(value) => setNewRouter({...newRouter, area: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select area" />
                        </SelectTrigger>
                        <SelectContent>
                          {areas.map((area) => (
                            <SelectItem key={area.id} value={area.name}>
                              {area.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button variant="outline" onClick={() => setShowRouterDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddRouter}>Add Router</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6">
              {routers.map((router) => (
                <Card key={router.id} className="p-6 bg-white shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-slate-100 rounded-lg">
                        {getStatusIcon(router.status)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{router.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{router.ipAddress}:{router.port}</span>
                          <span>•</span>
                          <span>{router.area}</span>
                          <span>•</span>
                          <span>Last seen: {router.lastSeen}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusBadgeColor(router.status)}>
                        {router.status.charAt(0).toUpperCase() + router.status.slice(1)}
                      </Badge>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => testConnection(router)}
                          className="hover:bg-blue-50"
                        >
                          <Activity className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4 mr-1" />
                          Config
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Areas Tab */}
          <TabsContent value="areas" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Area Management</h2>
              <Dialog open={showAreaDialog} onOpenChange={setShowAreaDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Area
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Area</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="area-name">Area Name</Label>
                      <Input
                        id="area-name"
                        value={newArea.name}
                        onChange={(e) => setNewArea({...newArea, name: e.target.value})}
                        placeholder="e.g., Area A - Central"
                      />
                    </div>
                    <div>
                      <Label htmlFor="area-description">Description</Label>
                      <Textarea
                        id="area-description"
                        value={newArea.description}
                        onChange={(e) => setNewArea({...newArea, description: e.target.value})}
                        placeholder="Describe this area..."
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button variant="outline" onClick={() => setShowAreaDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddArea}>Add Area</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {areas.map((area) => (
                <Card key={area.id} className="p-6 bg-white shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <MapPin className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{area.name}</h3>
                        <p className="text-sm text-gray-600">{area.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{area.routerCount}</p>
                      <p className="text-xs text-gray-600">Routers</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{area.customerCount}</p>
                      <p className="text-xs text-gray-600">Customers</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
