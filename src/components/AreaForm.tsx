
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Area } from '@/types/isp';

interface AreaFormProps {
  onClose: () => void;
  onSubmit?: (areaData: any) => void;
  area?: Area;
  isEdit?: boolean;
}

const AreaForm: React.FC<AreaFormProps> = ({ onClose, onSubmit, area, isEdit = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Load area data when editing
  useEffect(() => {
    if (isEdit && area) {
      setFormData({
        name: area.name || '',
        description: area.description || ''
      });
    }
  }, [isEdit, area]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nama wilayah harus diisi');
      return;
    }

    if (onSubmit) {
      await onSubmit(formData);
    } else {
      console.log('Area form submitted:', formData);
      toast.success(isEdit ? 'Wilayah berhasil diperbarui' : 'Wilayah berhasil ditambahkan');
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
          {isEdit ? 'Edit Wilayah' : 'Tambah Wilayah Baru'}
        </h1>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Wilayah</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Wilayah *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Masukkan nama wilayah"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Masukkan deskripsi wilayah"
                  rows={3}
                />
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

export default AreaForm;
