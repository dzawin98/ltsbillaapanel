
import { useState, useEffect } from 'react';
import { RouterDevice } from '@/types/isp';
import { api } from '@/utils/api';
import { toast } from 'sonner';

export const useRouters = () => {
  const [routers, setRouters] = useState<RouterDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRouters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.getRouters();
      
      if (response.success && response.data) {
        setRouters(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch routers');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to load routers: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const addRouter = async (routerData: Partial<RouterDevice>) => {
    try {
      const response = await api.createRouter(routerData);
      
      if (response.success && response.data) {
        setRouters(prev => [...prev, response.data!]);
        toast.success('Router added successfully');
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to add router');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to add router: ${errorMessage}`);
      throw err;
    }
  };

  const updateRouter = async (id: string, routerData: Partial<RouterDevice>) => {
    try {
      const response = await api.updateRouter(id, routerData);
      
      if (response.success && response.data) {
        setRouters(prev => prev.map(router => 
          router.id === id ? response.data! : router
        ));
        toast.success('Router updated successfully');
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update router');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to update router: ${errorMessage}`);
      throw err;
    }
  };

  const deleteRouter = async (id: string) => {
    try {
      const response = await api.deleteRouter(id);
      
      if (response.success) {
        setRouters(prev => prev.filter(router => router.id !== id));
        toast.success('Router deleted successfully');
      } else {
        throw new Error(response.message || 'Failed to delete router');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to delete router: ${errorMessage}`);
      throw err;
    }
  };

  const testConnection = async (id: string) => {
    try {
      // Update router status to indicate testing
      setRouters(prev => prev.map(router => 
        router.id === id 
          ? { ...router, status: 'maintenance' as const }
          : router
      ));

      const response = await api.testRouterConnection(id);
      
      if (response.success && response.data) {
        const { success, message, latency, routerInfo } = response.data;
        
        // Update router status based on test result
        setRouters(prev => prev.map(router => 
          router.id === id 
            ? { 
                ...router, 
                status: success ? 'online' as const : 'error' as const,
                lastSeen: success ? 'Just now' : 'Connection failed',
                model: routerInfo?.model || router.model,
                firmware: routerInfo?.version || router.firmware,
                uptime: routerInfo?.uptime || router.uptime
              }
            : router
        ));

        if (success) {
          toast.success(`${message}${latency ? ` (${latency}ms)` : ''}`);
        } else {
          toast.error(message);
        }

        return response.data;
      } else {
        throw new Error(response.message || 'Connection test failed');
      }
    } catch (err) {
      // Update router status to error on exception
      setRouters(prev => prev.map(router => 
        router.id === id 
          ? { ...router, status: 'error' as const, lastSeen: 'Connection failed' }
          : router
      ));

      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Connection test failed: ${errorMessage}`);
      throw err;
    }
  };

  // Get routers by area
  const getRoutersByArea = (areaName: string) => {
    return routers.filter(router => router.area === areaName);
  };

  // Get router statistics
  const getRouterStats = () => {
    const total = routers.length;
    const online = routers.filter(r => r.status === 'online').length;
    const offline = routers.filter(r => r.status === 'offline').length;
    const error = routers.filter(r => r.status === 'error').length;
    const maintenance = routers.filter(r => r.status === 'maintenance').length;

    return {
      total,
      online,
      offline,
      error,
      maintenance,
      onlinePercentage: total > 0 ? Math.round((online / total) * 100) : 0
    };
  };

  useEffect(() => {
    fetchRouters();
  }, []);

  return {
    routers,
    loading,
    error,
    addRouter,
    updateRouter,
    deleteRouter,
    testConnection,
    refreshRouters: fetchRouters,
    getRoutersByArea,
    getRouterStats
  };
};
