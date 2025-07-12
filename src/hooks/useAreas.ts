
import { useState, useEffect } from 'react';
import { Area } from '@/types/isp';
import { api } from '@/utils/api';
import { toast } from 'sonner';

export const useAreas = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAreas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.getAreas();
      
      if (response.success && response.data) {
        setAreas(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch areas');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to load areas: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const addArea = async (areaData: Partial<Area>) => {
    try {
      const response = await api.createArea(areaData);
      
      if (response.success && response.data) {
        setAreas(prev => [...prev, response.data!]);
        toast.success('Area added successfully');
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to add area');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to add area: ${errorMessage}`);
      throw err;
    }
  };

  const updateArea = async (id: string, areaData: Partial<Area>) => {
    try {
      const response = await api.updateArea(id, areaData);
      
      if (response.success && response.data) {
        setAreas(prev => prev.map(area => 
          area.id === id ? response.data! : area
        ));
        toast.success('Area updated successfully');
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update area');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to update area: ${errorMessage}`);
      throw err;
    }
  };

  const deleteArea = async (id: string) => {
    try {
      const response = await api.deleteArea(id);
      
      if (response.success) {
        setAreas(prev => prev.filter(area => area.id !== id));
        toast.success('Area deleted successfully');
      } else {
        throw new Error(response.message || 'Failed to delete area');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to delete area: ${errorMessage}`);
      throw err;
    }
  };

  // Get area statistics
  const getAreaStats = () => {
    const totalAreas = areas.length;
    const totalRouters = areas.reduce((sum, area) => sum + area.routerCount, 0);
    const totalCustomers = areas.reduce((sum, area) => sum + area.customerCount, 0);
    const totalRevenue = areas.reduce((sum, area) => sum + (area.revenue || 0), 0);
    
    const activeAreas = areas.filter(area => area.status === 'active').length;
    const maintenanceAreas = areas.filter(area => area.status === 'maintenance').length;
    const inactiveAreas = areas.filter(area => area.status === 'inactive').length;

    return {
      totalAreas,
      totalRouters,
      totalCustomers,
      totalRevenue,
      activeAreas,
      maintenanceAreas,
      inactiveAreas,
      averageCustomersPerArea: totalAreas > 0 ? Math.round(totalCustomers / totalAreas) : 0,
      averageRevenuePerArea: totalAreas > 0 ? Math.round(totalRevenue / totalAreas) : 0
    };
  };

  // Find area by name
  const findAreaByName = (name: string) => {
    return areas.find(area => area.name === name);
  };

  // Get areas with most customers
  const getTopAreasByCustomers = (limit: number = 5) => {
    return [...areas]
      .sort((a, b) => b.customerCount - a.customerCount)
      .slice(0, limit);
  };

  // Get areas with highest revenue
  const getTopAreasByRevenue = (limit: number = 5) => {
    return [...areas]
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, limit);
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  return {
    areas,
    loading,
    error,
    addArea,
    updateArea,
    deleteArea,
    refreshAreas: fetchAreas,
    getAreaStats,
    findAreaByName,
    getTopAreasByCustomers,
    getTopAreasByRevenue
  };
};
