
import { useState, useEffect } from 'react';
import { Package } from '@/types/isp';
import { api } from '@/utils/api';
import { toast } from 'sonner';

export const usePackages = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.getPackages();
      
      if (response.success && response.data) {
        // Transform backend data to frontend format
        // Di dalam fetchPackages function, update transformasi:
        const transformedPackages = response.data.map((pkg: any) => ({
          id: pkg.id.toString(),
          name: pkg.name,
          description: pkg.description || '',
          bandwidth: {
            download: pkg.downloadSpeed || 0,
            upload: pkg.uploadSpeed || 0
          },
          price: parseFloat(pkg.price) || 0,
          duration: pkg.duration || 30,
          mikrotikProfile: pkg.mikrotikProfile || '',
          routerName: pkg.routerName || '', // Tambahkan ini
          isActive: pkg.isActive !== undefined ? pkg.isActive : true,
          createdAt: new Date(pkg.createdAt),
          updatedAt: new Date(pkg.updatedAt)
        }));
        setPackages(transformedPackages);
      } else {
        throw new Error(response.message || 'Failed to fetch packages');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to load packages: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const addPackage = async (packageData: Omit<Package, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await api.createPackage(packageData);
      
      if (response.success && response.data) {
        await fetchPackages(); // Refresh the list
        toast.success('Package berhasil ditambahkan');
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create package');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to add package: ${errorMessage}`);
      throw err;
    }
  };

  const updatePackage = async (id: string, packageData: Partial<Package>) => {
    try {
      const response = await api.updatePackage(id, packageData);
      
      if (response.success && response.data) {
        await fetchPackages(); // Refresh the list
        toast.success('Package berhasil diperbarui');
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update package');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to update package: ${errorMessage}`);
      throw err;
    }
  };

  const deletePackage = async (id: string) => {
    try {
      const response = await api.deletePackage(id);
      
      if (response.success) {
        await fetchPackages(); // Refresh the list
        toast.success('Package berhasil dihapus');
      } else {
        throw new Error(response.message || 'Failed to delete package');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to delete package: ${errorMessage}`);
      throw err;
    }
  };

  // Get package statistics
  const getPackageStats = () => {
    const totalPackages = packages.length;
    const activePackages = packages.filter(p => p.isActive).length;
    const avgPrice = packages.length > 0 ? 
      Math.round(packages.reduce((sum, pkg) => sum + pkg.price, 0) / packages.length) : 0;
    
    return {
      totalPackages,
      activePackages,
      inactivePackages: totalPackages - activePackages,
      avgPrice,
      totalRevenuePotential: packages.reduce((sum, pkg) => sum + pkg.price, 0)
    };
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  return {
    packages,
    loading,
    error,
    addPackage,
    updatePackage,
    deletePackage,
    refreshPackages: fetchPackages,
    getPackageStats
  };
};
