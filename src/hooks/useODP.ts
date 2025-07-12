import { useState, useEffect } from 'react';
import { ODP } from '@/types/isp';
import { api } from '@/utils/api';
import { toast } from 'sonner';

export const useODP = () => {
  const [odp, setOdp] = useState<ODP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchODPs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.getODPs();
      
      if (response.success && response.data) {
        setOdp(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch ODPs');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to load ODPs: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const addODP = async (odpData: Partial<ODP>) => {
    try {
      const response = await api.createODP(odpData);
      
      if (response.success && response.data) {
        setOdp(prev => [...prev, response.data!]);
        toast.success('ODP added successfully');
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to add ODP');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to add ODP: ${errorMessage}`);
      throw err;
    }
  };

  const updateODP = async (id: string, odpData: Partial<ODP>) => {
    try {
      const response = await api.updateODP(id, odpData);
      
      if (response.success && response.data) {
        setOdp(prev => prev.map(item => 
          item.id === id ? response.data! : item
        ));
        toast.success('ODP updated successfully');
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update ODP');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to update ODP: ${errorMessage}`);
      throw err;
    }
  };

  const deleteODP = async (id: string) => {
    try {
      const response = await api.deleteODP(id);
      
      if (response.success) {
        setOdp(prev => prev.filter(item => item.id !== id));
        toast.success('ODP deleted successfully');
      } else {
        throw new Error(response.message || 'Failed to delete ODP');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to delete ODP: ${errorMessage}`);
      throw err;
    }
  };

  // Get ODP statistics
  const getODPStats = () => {
    const total = odp.length;
    const totalSlots = odp.reduce((sum, item) => sum + item.totalSlots, 0);
    const usedSlots = odp.reduce((sum, item) => sum + item.usedSlots, 0);
    const availableSlots = totalSlots - usedSlots;
    const utilizationRate = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0;

    return {
      total,
      totalSlots,
      usedSlots,
      availableSlots,
      utilizationRate
    };
  };

  useEffect(() => {
    fetchODPs();
  }, []);

  return {
    odp,
    loading,
    error,
    addODP,
    updateODP,
    deleteODP,
    refreshODPs: fetchODPs,
    getODPStats
  };
};