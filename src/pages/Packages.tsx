
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { PackageForm } from '@/components/PackageForm';
import { usePackages } from '@/hooks/usePackages';
import { Package } from '@/types/isp';

const Packages = () => {
  const { packages, loading, addPackage, updatePackage, deletePackage } = usePackages();
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<Package | null>(null);

  const handleAddPackage = async (packageData: any) => {
    try {
      await addPackage(packageData);
      setShowForm(false);
    } catch (error) {
      console.error('Error adding package:', error);
    }
  };

  const handleEditPackage = async (packageData: any) => {
    if (!editingPackage) return;
    
    try {
      await updatePackage(editingPackage.id, packageData);
      setEditingPackage(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error updating package:', error);
    }
  };

  const handleDeletePackage = async () => {
    if (!deletingPackage) return;
    
    try {
      await deletePackage(deletingPackage.id);
      setDeletingPackage(null);
    } catch (error) {
      console.error('Error deleting package:', error);
    }
  };

  if (showForm) {
    return (
      <PackageForm
        onClose={() => {
          setShowForm(false);
          setEditingPackage(null);
        }}
        onSubmit={editingPackage ? handleEditPackage : handleAddPackage}
        package={editingPackage || undefined}
        isEdit={!!editingPackage}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paket</h1>
          <p className="text-gray-600">Pengelolaan data paket</p>
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
        className="bg-blue-600 hover:bg-blue-700"
        onClick={() => setShowForm(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Tambah Paket
      </Button>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama Paket</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Router</TableHead>
                  <TableHead>Kecepatan</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Mikrotik Profile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : packages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Tidak ada data paket
                    </TableCell>
                  </TableRow>
                ) : (
                  packages.map((pkg, index) => (
                    <TableRow key={pkg.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell>{pkg.description || '-'}</TableCell>
                      <TableCell>{(pkg as any).routerName || '-'}</TableCell>
                      <TableCell>{pkg.bandwidth.download}/{pkg.bandwidth.upload} Mbps</TableCell>
                      <TableCell>Rp {pkg.price.toLocaleString('id-ID')}</TableCell>
                      <TableCell>{pkg.duration} hari</TableCell>
                      <TableCell>{pkg.mikrotikProfile}</TableCell>
                      <TableCell>
                        <Badge className={pkg.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {pkg.isActive ? 'Aktif' : 'Tidak Aktif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingPackage(pkg);
                              setShowForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingPackage(pkg)}
                            className="text-red-600 hover:text-red-700"
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
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPackage} onOpenChange={() => setDeletingPackage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Paket</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus paket "{deletingPackage?.name}"? 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePackage}
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

export default Packages;
