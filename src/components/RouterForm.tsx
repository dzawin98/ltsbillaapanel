
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Router, Wifi, AlertCircle, CheckCircle } from 'lucide-react';
import { RouterDevice } from '@/types/isp';

interface RouterFormProps {
  onClose: () => void;
  onSubmit?: (routerData: any) => void;
  router?: RouterDevice;
  isEdit?: boolean;
}

export const RouterForm = ({ onClose, onSubmit, router, isEdit = false }: RouterFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    ipAddress: '',
    port: 8728,
    username: '',
    password: ''
  });

  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load router data when editing
  useEffect(() => {
    if (isEdit && router) {
      setFormData({
        name: router.name || '',
        ipAddress: router.ipAddress || '',
        port: router.port || 8728,
        username: router.username || '',
        password: router.password || ''
      });
    }
  }, [isEdit, router]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setConnectionStatus('idle');
  };

  const testConnection = async () => {
    if (!formData.ipAddress || !formData.username || !formData.password) {
      toast.error('IP Address, Username, dan Password diperlukan untuk test koneksi');
      return;
    }

    setTesting(true);
    toast.info('Testing connection to MikroTik router...');

    // Simulate API call to test MikroTik connection
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success rate for demo
      
      if (success) {
        setConnectionStatus('success');
        toast.success('Connection successful! Router is reachable.');
      } else {
        setConnectionStatus('error');
        toast.error('Connection failed. Check IP address and credentials.');
      }
      
      setTesting(false);
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.ipAddress || !formData.username || !formData.password) {
      toast.error('Semua field harus diisi');
      return;
    }

    if (onSubmit) {
      onSubmit(formData);
    }
    
    toast.success(isEdit ? 'Router berhasil diperbarui' : 'Router berhasil ditambahkan');
    onClose();
  };

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'success':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Connection Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="p-6 bg-white shadow-sm border-slate-200">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Router className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Router' : 'Add New Router'}
          </h3>
          <p className="text-sm text-gray-600">Configure MikroTik router connection</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name">Router Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="e.g., Router Utama"
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="ipAddress">IP Address *</Label>
            <Input
              id="ipAddress"
              value={formData.ipAddress}
              onChange={(e) => handleInputChange('ipAddress', e.target.value)}
              placeholder="192.168.1.1"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="port">API Port</Label>
            <Input
              id="port"
              type="number"
              value={formData.port}
              onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
              placeholder="8728"
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="admin"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Password"
              className="mt-1"
            />
          </div>
        </div>

        {/* Connection Test Section */}
        <div className="border rounded-lg p-4 bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Wifi className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Connection Test</span>
            </div>
            {getConnectionStatusBadge()}
          </div>
          
          <Button
            type="button"
            variant="outline"
            onClick={testConnection}
            disabled={testing || !formData.ipAddress || !formData.username || !formData.password}
            className="w-full"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Testing Connection...
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>
          
          <p className="text-xs text-slate-500 mt-2">
            Test the connection to ensure router is reachable before {isEdit ? 'updating' : 'adding'}
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={connectionStatus === 'error'}
          >
            {isEdit ? 'Update Router' : 'Add Router'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
