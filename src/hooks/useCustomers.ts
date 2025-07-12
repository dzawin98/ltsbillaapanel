
import { useState, useEffect } from 'react';
import { Customer } from '@/types/isp';
import { api } from '@/utils/api';
import { toast } from 'sonner';

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.getCustomers();
      
      if (response.success && response.data) {
        setCustomers(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch customers');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to load customers: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await api.createCustomer(customerData);
      
      if (response.success && response.data) {
        setCustomers(prev => [...prev, response.data!]);
        toast.success('Customer added successfully');
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to add customer');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to add customer: ${errorMessage}`);
      throw err;
    }
  };

  const updateCustomer = async (id: string, customerData: Partial<Customer>) => {
    try {
      const response = await api.updateCustomer(id, customerData);
      
      if (response.success && response.data) {
        setCustomers(prev => prev.map(customer => 
          customer.id === id ? response.data! : customer
        ));
        toast.success('Pelanggan berhasil diperbarui');
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update customer');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Gagal memperbarui pelanggan: ${errorMessage}`);
      throw err;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const response = await api.deleteCustomer(id);
      
      if (response.success) {
        setCustomers(prev => prev.filter(customer => customer.id !== id));
        toast.success('Pelanggan berhasil dihapus');
      } else {
        throw new Error(response.message || 'Failed to delete customer');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Gagal menghapus pelanggan: ${errorMessage}`);
      throw err;
    }
  };

  // Get customer statistics
  const getCustomerStats = () => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    const suspendedCustomers = customers.filter(c => c.status === 'suspended').length;
    const pendingCustomers = customers.filter(c => c.status === 'pending').length;
    
    return {
      totalCustomers,
      activeCustomers,
      suspendedCustomers,
      pendingCustomers,
      activePercentage: totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0
    };
  };

  // Get customers by area
  const getCustomersByArea = (areaName: string) => {
    return customers.filter(customer => customer.area === areaName);
  };

  // Get customers by package
  const getCustomersByPackage = (packageName: string) => {
    return customers.filter(customer => customer.package === packageName);
  };

  // Calculate revenue and bills
  const calculateRevenue = () => {
    return customers
      .filter(c => c.status === 'active')
      .reduce((total, customer) => {
        const packagePrice = customer.packagePrice || 0;
        const addonPrice = customer.addonPrice || 0;
        const discount = customer.discount || 0;
        return total + (packagePrice + addonPrice - discount);
      }, 0);
  };

  const calculateActiveBills = () => {
    return customers
      .filter(c => c.status === 'active' && c.paymentDueDate && new Date(c.paymentDueDate) >= new Date())
      .reduce((total, customer) => {
        const packagePrice = customer.packagePrice || 0;
        const addonPrice = customer.addonPrice || 0;
        const discount = customer.discount || 0;
        return total + (packagePrice + addonPrice - discount);
      }, 0);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    refreshCustomers: fetchCustomers,
    getCustomerStats,
    getCustomersByArea,
    getCustomersByPackage,
    stats: {
      total: customers.length,
      active: customers.filter(c => c.status === 'active').length,
      suspended: customers.filter(c => c.status === 'suspended').length,
      pending: customers.filter(c => c.status === 'pending').length,
      totalCustomers: customers.length,
      totalRevenue: calculateRevenue(),
      activeBills: calculateActiveBills()
    }
  };
};
