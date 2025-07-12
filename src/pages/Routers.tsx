
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Edit, Trash2, Wifi } from 'lucide-react';
import { useRouters } from '@/hooks/useRouters';
import { RouterForm } from '@/components/RouterForm';
import { RouterDevice } from '@/types/isp';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Routers = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingRouter, setEditingRouter] = useState<RouterDevice | null>(null);
  const [deletingRouter, setDeletingRouter] = useState<RouterDevice | null>(null);
  const { routers, loading, addRouter, updateRouter, deleteRouter, testConnection } = useRouters();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500 text-white">Online</Badge>;
      case 'offline':
        return <Badge className="bg-red-500 text-white">Offline</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-500 text-white">Testing...</Badge>;
      case 'error':
        return <Badge className="bg-red-600 text-white">Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleTestConnection = async (routerId: string | number) => {
    try {
      await testConnection(String(routerId));
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  };

  const handleEditRouter = async (routerData: any) => {
    if (!editingRouter) return;
    
    try {
      await updateRouter(String(editingRouter.id), routerData);
      setEditingRouter(null);
    } catch (error) {
      console.error('Failed to update router:', error);
    }
  };

  const handleDeleteRouter = async () => {
    if (!deletingRouter) return;
    
    try {
      await deleteRouter(String(deletingRouter.id));
      setDeletingRouter(null);
    } catch (error) {
      console.error('Failed to delete router:', error);
    }
  };

  const handleAddRouter = async (routerData: any) => {
    try {
      await addRouter(routerData);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to add router:', error);
    }
  };

  if (showForm) {
    return (
      <div className="p-6">
        <RouterForm 
          onClose={() => setShowForm(false)}
          onSubmit={handleAddRouter}
        />
      </div>
    );
  }

  if (editingRouter) {
    return (
      <div className="p-6">
        <RouterForm 
          router={editingRouter}
          onClose={() => setEditingRouter(null)}
          onSubmit={handleEditRouter}
          isEdit={true}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Router Management</h1>
        <p className="text-gray-600">Kelola router MikroTik Anda</p>
      </div>

      <Button 
        onClick={() => setShowForm(true)}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        Tambah Router
      </Button>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Nama Router</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Status Koneksi</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : routers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Tidak ada data router
                  </TableCell>
                </TableRow>
              ) : (
                routers.map((router, index) => (
                  <TableRow key={String(router.id)}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{router.name}</TableCell>
                    <TableCell>{router.ipAddress}</TableCell>
                    <TableCell>{router.port}</TableCell>
                    <TableCell>{getStatusBadge(router.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0 bg-blue-100 text-blue-600 hover:bg-blue-200"
                          onClick={() => handleTestConnection(router.id)}
                          disabled={router.status === 'maintenance'}
                          title="Test Connection"
                        >
                          <Wifi className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0 bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                          onClick={() => setEditingRouter(router)}
                          title="Edit Router"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0 bg-red-100 text-red-600 hover:bg-red-200"
                          onClick={() => setDeletingRouter(router)}
                          title="Delete Router"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingRouter} onOpenChange={() => setDeletingRouter(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Router</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus router "{deletingRouter?.name}"? 
              Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi semua pelanggan yang terhubung ke router ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRouter}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Routers;
