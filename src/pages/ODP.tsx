import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { ODPForm } from '@/components/ODPForm';
import { useODP } from '@/hooks/useODP';
import { ODP } from '@/types/isp';
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

const ODPPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingODP, setEditingODP] = useState<ODP | null>(null);
  const [deletingODP, setDeletingODP] = useState<ODP | null>(null);
  const { odp, loading, addODP, updateODP, deleteODP } = useODP();

  const handleAddODP = async (odpData: any) => {
    try {
      await addODP(odpData);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to add ODP:', error);
    }
  };

  const handleEditODP = async (odpData: any) => {
    if (!editingODP) return;
    
    try {
      await updateODP(editingODP.id, odpData);
      setEditingODP(null);
    } catch (error) {
      console.error('Failed to update ODP:', error);
    }
  };

  const handleDeleteODP = async () => {
    if (!deletingODP) return;
    
    try {
      await deleteODP(deletingODP.id);
      setDeletingODP(null);
    } catch (error) {
      console.error('Failed to delete ODP:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-500 text-white">Maintenance</Badge>;
      case 'inactive':
        return <Badge className="bg-red-500 text-white">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (showForm) {
    return (
      <div className="p-6">
        <ODPForm 
          onClose={() => setShowForm(false)}
          onSubmit={handleAddODP}
        />
      </div>
    );
  }

  if (editingODP) {
    return (
      <div className="p-6">
        <ODPForm 
          odp={editingODP}
          onClose={() => setEditingODP(null)}
          onSubmit={handleEditODP}
          isEdit={true}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ODP</h1>
        <p className="text-gray-600">Pengelolaan data ODP</p>
      </div>

      <Button 
        onClick={() => setShowForm(true)}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        Tambah ODP
      </Button>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Nama ODP</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Total Slot</TableHead>
                <TableHead>Terpakai</TableHead>
                <TableHead>Tersedia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Koordinat</TableHead>
                <TableHead>Act</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : odp.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Tidak ada data ODP
                  </TableCell>
                </TableRow>
              ) : (
                odp.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.area}</TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell>{item.totalSlots}</TableCell>
                    <TableCell>{item.usedSlots}</TableCell>
                    <TableCell>{item.availableSlots}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      {item.coordinates ? (
                        <a 
                          href={`https://www.google.com/maps?q=${item.coordinates.latitude},${item.coordinates.longitude}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:underline"
                        >
                          {`${item.coordinates.latitude},${item.coordinates.longitude}`}
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0 bg-yellow-100 text-yellow-600"
                          onClick={() => setEditingODP(item)}
                          title="Edit ODP"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0 bg-red-100 text-red-600"
                          onClick={() => setDeletingODP(item)}
                          title="Delete ODP"
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingODP} onOpenChange={() => setDeletingODP(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus ODP</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus ODP "{deletingODP?.name}"? 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteODP}
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

export default ODPPage;