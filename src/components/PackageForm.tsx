import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Package, MikrotikProfile } from '@/types/isp';
import { useRouters } from '@/hooks/useRouters';
import { api } from '@/utils/api';

interface PackageFormProps {
  onClose: () => void;
  onSubmit?: (packageData: any) => void;
  package?: Package;
  isEdit?: boolean;
}

export const PackageForm = ({ onClose, onSubmit, package: pkg, isEdit = false }: PackageFormProps) => {
  const { routers, loading: routersLoading } = useRouters();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    downloadSpeed: 0,
    uploadSpeed: 0,
    price: 0,
    // duration: 30,  // Remove this line
    routerName: '',
    mikrotikProfile: '',
    isActive: true
  });
  
  const [pppProfiles, setPppProfiles] = useState<MikrotikProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Load package data when editing
  useEffect(() => {
    if (isEdit && pkg) {
      setFormData({
        name: pkg.name || '',
        description: pkg.description || '',
        downloadSpeed: pkg.bandwidth?.download || 0,
        uploadSpeed: pkg.bandwidth?.upload || 0,
        price: pkg.price || 0,
        // duration: pkg.duration || 30,  // Remove this line
        routerName: pkg.routerName || '',
        mikrotikProfile: pkg.mikrotikProfile || '',
        isActive: pkg.isActive !== undefined ? pkg.isActive : true
      });
      
      // Load PPP profiles if router is already selected
      if (pkg.routerName) {
        const selectedRouter = routers.find(r => r.name === pkg.routerName);
        if (selectedRouter) {
          loadPPPProfiles(selectedRouter.id.toString());
        }
      }
    }
  }, [isEdit, pkg, routers]);

  const loadPPPProfiles = async (routerId: string) => {
    try {
      setLoadingProfiles(true);
      const response = await api.getRouterPPPProfiles(routerId);
      
      if (response.success && response.data) {
        setPppProfiles(response.data);
      } else {
        toast.error('Gagal memuat profile PPP');
        setPppProfiles([]);
      }
    } catch (error) {
      console.error('Error loading PPP profiles:', error);
      toast.error('Gagal memuat profile PPP');
      setPppProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRouterChange = (routerName: string) => {
    handleInputChange('routerName', routerName);
    handleInputChange('mikrotikProfile', ''); // Reset profile when router changes
    
    const selectedRouter = routers.find(r => r.name === routerName);
    if (selectedRouter) {
      loadPPPProfiles(selectedRouter.id.toString()); // Add .toString()
    } else {
      setPppProfiles([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nama paket harus diisi');
      return;
    }

    if (!formData.routerName) {
      toast.error('Router harus dipilih');
      return;
    }

    if (!formData.mikrotikProfile.trim()) {
      toast.error('Mikrotik profile harus dipilih');
      return;
    }

    if (formData.downloadSpeed <= 0) {
      toast.error('Kecepatan download harus lebih dari 0');
      return;
    }

    if (formData.uploadSpeed <= 0) {
      toast.error('Kecepatan upload harus lebih dari 0');
      return;
    }

    if (formData.price <= 0) {
      toast.error('Harga harus lebih dari 0');
      return;
    }

    const packageData = {
      name: formData.name,
      description: formData.description,
      downloadSpeed: formData.downloadSpeed,  // Changed from bandwidth.download
      uploadSpeed: formData.uploadSpeed,      // Changed from bandwidth.upload
      price: formData.price,
      // duration: formData.duration,         // Removed duration field
      routerName: formData.routerName,
      mikrotikProfile: formData.mikrotikProfile,
      isActive: formData.isActive
    };

    if (onSubmit) {
      await onSubmit(packageData);
    } else {
      console.log('Package form submitted:', packageData);
      toast.success(isEdit ? 'Paket berhasil diperbarui' : 'Paket berhasil ditambahkan');
      onClose();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={onClose}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Paket' : 'Tambah Paket Baru'}
        </h1>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Paket</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Paket *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Masukkan nama paket"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Masukkan deskripsi paket"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="router">Router *</Label>
                <Select
                  value={formData.routerName}
                  onValueChange={handleRouterChange}
                  disabled={routersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={routersLoading ? "Memuat router..." : "Pilih router"} />
                  </SelectTrigger>
                  <SelectContent>
                    {routers.map((router) => (
                      <SelectItem key={router.id.toString()} value={router.name}>
                        {router.name} ({router.ipAddress})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mikrotikProfile">Profile PPP Mikrotik *</Label>
                <Select
                  value={formData.mikrotikProfile}
                  onValueChange={(value) => handleInputChange('mikrotikProfile', value)}
                  disabled={!formData.routerName || loadingProfiles}
                >
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={
                        !formData.routerName 
                          ? "Pilih router terlebih dahulu" 
                          : loadingProfiles 
                          ? "Memuat profile..." 
                          : "Pilih profile PPP"
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {pppProfiles.map((profile) => (
                      <SelectItem key={profile.name} value={profile.name}>
                        {profile.name} ({profile.rateLimit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="downloadSpeed">Kecepatan Download (Mbps) *</Label>
                  <Input
                    id="downloadSpeed"
                    type="number"
                    min="1"
                    value={formData.downloadSpeed}
                    onChange={(e) => handleInputChange('downloadSpeed', parseInt(e.target.value) || 0)}
                    placeholder="10"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="uploadSpeed">Kecepatan Upload (Mbps) *</Label>
                  <Input
                    id="uploadSpeed"
                    type="number"
                    min="1"
                    value={formData.uploadSpeed}
                    onChange={(e) => handleInputChange('uploadSpeed', parseInt(e.target.value) || 0)}
                    placeholder="5"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">  {/* Changed from grid-cols-2 to grid-cols-1 */}
                <div>
                  <Label htmlFor="price">Harga (Rp) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseInt(e.target.value) || 0)}
                    placeholder="100000"
                    required
                  />
                </div>
                {/* Removed duration input field */}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
                <Label htmlFor="isActive">Paket Aktif</Label>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Batal
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {isEdit ? 'Perbarui' : 'Simpan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};