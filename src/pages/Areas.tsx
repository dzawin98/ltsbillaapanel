
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useAreas } from '@/hooks/useAreas';
import AreaForm from '@/components/AreaForm';
import { Area } from '@/types/isp';
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

const Areas = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [deletingArea, setDeletingArea] = useState<Area | null>(null);
  const { areas, loading, addArea, updateArea, deleteArea } = useAreas();

  const handleAddArea = async (areaData: any) => {
    try {
      await addArea(areaData);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to add area:', error);
    }
  };

  const handleEditArea = async (areaData: any) => {
    if (!editingArea) return;
    
    try {
      await updateArea(editingArea.id, areaData);
      setEditingArea(null);
    } catch (error) {
      console.error('Failed to update area:', error);
    }
  };

  const handleDeleteArea = async () => {
    if (!deletingArea) return;
    
    try {
      await deleteArea(deletingArea.id);
      setDeletingArea(null);
    } catch (error) {
      console.error('Failed to delete area:', error);
    }
  };

  if (showForm) {
    return (
      <AreaForm 
        onClose={() => setShowForm(false)} 
        onSubmit={handleAddArea}
      />
    );
  }

  if (editingArea) {
    return (
      <AreaForm 
        area={editingArea}
        onClose={() => setEditingArea(null)} 
        onSubmit={handleEditArea}
        isEdit={true}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wilayah</h1>
          <p className="text-gray-600">Pengelolaan data wilayah</p>
        </div>
        <div className="flex items-center space-x-2">
          <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option>Lihat 10 baris</option>
            <option>Lihat 25 baris</option>
            <option>Lihat 50 baris</option>
          </select>
        </div>
      </div>

      {/* Add Button */}
      <Button 
        onClick={() => setShowForm(true)}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        Tambah Wilayah
      </Button>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Area / Wilayah</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Act</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : areas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Tidak ada data wilayah
                  </TableCell>
                </TableRow>
              ) : (
                areas.map((area, index) => (
                  <TableRow key={area.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{area.name}</TableCell>
                    <TableCell>{area.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0 bg-yellow-100 text-yellow-600"
                          onClick={() => setEditingArea(area)}
                          title="Edit Area"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0 bg-red-100 text-red-600"
                          onClick={() => setDeletingArea(area)}
                          title="Delete Area"
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

      {/* Pagination */}
      <div className="flex justify-center space-x-2">
        <Button variant="outline" size="sm">First</Button>
        <Button variant="outline" size="sm" className="bg-blue-600 text-white">1</Button>
        <Button variant="outline" size="sm">»</Button>
        <Button variant="outline" size="sm">Last</Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingArea} onOpenChange={() => setDeletingArea(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Wilayah</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus wilayah "{deletingArea?.name}"? 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteArea}
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

export default Areas;
