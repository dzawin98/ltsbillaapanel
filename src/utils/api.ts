import axios from 'axios';
import { 
  RouterDevice, 
  Area, 
  ODP, 
  Package, 
  Customer, 
  Transaction, 
  ApiResponse,
  MikrotikProfile,
  PPPSecret
} from '@/types/isp';

const API_BASE_URL = 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Router API functions
export const getRouters = async (): Promise<ApiResponse<RouterDevice[]>> => {
  try {
    const response = await apiClient.get('/routers');
    return response.data;
  } catch (error) {
    console.error('Error fetching routers:', error);
    // Return dummy data as fallback
    return {
      success: true,
      data: [
        {
          id: '1',
          name: 'Router Utama',
          ipAddress: '192.168.1.1',
          port: 8728,
          username: 'admin',
          password: 'admin123',
          status: 'online',
          lastSeen: 'Just now',
          area: 'Area 1',
          model: 'RB750Gr3',
          firmware: '7.1.5',
          uptime: '1d 2h 30m',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      message: 'Using dummy data - backend not available'
    };
  }
};

export const createRouter = async (routerData: Partial<RouterDevice>): Promise<ApiResponse<RouterDevice>> => {
  try {
    const response = await apiClient.post('/routers', routerData);
    return response.data;
  } catch (error) {
    console.error('Error creating router:', error);
    throw error;
  }
};

export const updateRouter = async (id: string, routerData: Partial<RouterDevice>): Promise<ApiResponse<RouterDevice>> => {
  try {
    const response = await apiClient.put(`/routers/${id}`, routerData);
    return response.data;
  } catch (error) {
    console.error('Error updating router:', error);
    throw error;
  }
};

export const deleteRouter = async (id: string): Promise<ApiResponse<void>> => {
  try {
    const response = await apiClient.delete(`/routers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting router:', error);
    throw error;
  }
};

export const testRouterConnection = async (id: string): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.post(`/routers/${id}/test-connection`);
    return response.data;
  } catch (error) {
    console.error('Error testing router connection:', error);
    throw error;
  }
};

// Area API functions
export const getAreas = async (): Promise<ApiResponse<Area[]>> => {
  try {
    const response = await apiClient.get('/areas');
    return response.data;
  } catch (error) {
    console.error('Error fetching areas:', error);
    return {
      success: true,
      data: [],
      message: 'Using dummy data - backend not available'
    };
  }
};

export const createArea = async (areaData: Partial<Area>): Promise<ApiResponse<Area>> => {
  try {
    const response = await apiClient.post('/areas', areaData);
    return response.data;
  } catch (error) {
    console.error('Error creating area:', error);
    throw error;
  }
};

export const updateArea = async (id: string, areaData: Partial<Area>): Promise<ApiResponse<Area>> => {
  try {
    const response = await apiClient.put(`/areas/${id}`, areaData);
    return response.data;
  } catch (error) {
    console.error('Error updating area:', error);
    throw error;
  }
};

export const deleteArea = async (id: string): Promise<ApiResponse<void>> => {
  try {
    const response = await apiClient.delete(`/areas/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting area:', error);
    throw error;
  }
};

// ODP API functions
export const getODPs = async (): Promise<ApiResponse<ODP[]>> => {
  try {
    const response = await apiClient.get('/odps');
    return response.data;
  } catch (error) {
    console.error('Error fetching ODPs:', error);
    return {
      success: true,
      data: [],
      message: 'Using dummy data - backend not available'
    };
  }
};

export const createODP = async (odpData: Partial<ODP>): Promise<ApiResponse<ODP>> => {
  try {
    const response = await apiClient.post('/odps', odpData);
    return response.data;
  } catch (error) {
    console.error('Error creating ODP:', error);
    throw error;
  }
};

export const updateODP = async (id: string, odpData: Partial<ODP>): Promise<ApiResponse<ODP>> => {
  try {
    const response = await apiClient.put(`/odps/${id}`, odpData);
    return response.data;
  } catch (error) {
    console.error('Error updating ODP:', error);
    throw error;
  }
};

export const deleteODP = async (id: string): Promise<ApiResponse<void>> => {
  try {
    const response = await apiClient.delete(`/odps/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting ODP:', error);
    throw error;
  }
};

// Package API functions
export const getPackages = async (): Promise<ApiResponse<Package[]>> => {
  try {
    const response = await apiClient.get('/packages');
    return response.data;
  } catch (error) {
    console.error('Error fetching packages:', error);
    return {
      success: true,
      data: [],
      message: 'Using dummy data - backend not available'
    };
  }
};

export const createPackage = async (packageData: Partial<Package>): Promise<ApiResponse<Package>> => {
  try {
    const response = await apiClient.post('/packages', packageData);
    return response.data;
  } catch (error) {
    console.error('Error creating package:', error);
    throw error;
  }
};

export const updatePackage = async (id: string, packageData: Partial<Package>): Promise<ApiResponse<Package>> => {
  try {
    const response = await apiClient.put(`/packages/${id}`, packageData);
    return response.data;
  } catch (error) {
    console.error('Error updating package:', error);
    throw error;
  }
};

export const deletePackage = async (id: string): Promise<ApiResponse<void>> => {
  try {
    const response = await apiClient.delete(`/packages/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting package:', error);
    throw error;
  }
};

// Customer API functions
export const getCustomers = async (): Promise<ApiResponse<Customer[]>> => {
  try {
    const response = await apiClient.get('/customers');
    return response.data;
  } catch (error) {
    console.error('Error fetching customers:', error);
    return {
      success: true,
      data: [],
      message: 'Using dummy data - backend not available'
    };
  }
};

export const createCustomer = async (customerData: Partial<Customer>): Promise<ApiResponse<Customer>> => {
  try {
    const response = await apiClient.post('/customers', customerData);
    return response.data;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

export const updateCustomer = async (id: string, customerData: Partial<Customer>): Promise<ApiResponse<Customer>> => {
  try {
    const response = await apiClient.put(`/customers/${id}`, customerData);
    return response.data;
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

export const deleteCustomer = async (id: string): Promise<ApiResponse<void>> => {
  try {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};

// Transaction API functions
export const getTransactions = async (): Promise<ApiResponse<Transaction[]>> => {
  try {
    const response = await apiClient.get('/transactions');
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return {
      success: true,
      data: [],
      message: 'Using dummy data - backend not available'
    };
  }
};

export const createTransaction = async (transactionData: Partial<Transaction>): Promise<ApiResponse<Transaction>> => {
  try {
    const response = await apiClient.post('/transactions', transactionData);
    return response.data;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
};

export const updateTransaction = async (id: string, transactionData: Partial<Transaction>): Promise<ApiResponse<Transaction>> => {
  try {
    const response = await apiClient.put(`/transactions/${id}`, transactionData);
    return response.data;
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

export const deleteTransaction = async (id: string): Promise<ApiResponse<void>> => {
  try {
    const response = await apiClient.delete(`/transactions/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

// MikroTik API functions
// Get PPP Secrets from router
export const getPPPSecrets = async (routerId: string): Promise<ApiResponse<PPPSecret[]>> => {
  try {
    const response = await apiClient.get(`/routers/${routerId}/ppp-secrets`);
    return {
      success: true,
      data: response.data,
      message: 'PPP Secrets retrieved successfully'
    };
  } catch (error) {
    console.error('Error fetching PPP secrets:', error);
    return {
      success: true,
      data: [],
      message: 'Using dummy data - backend not available'
    };
  }
};

// Billing API functions
// Trigger auto suspend manually
export const triggerAutoSuspend = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.post('/trigger-auto-suspend');
    return response.data;
  } catch (error) {
    console.error('Error triggering auto suspend:', error);
    throw error;
  }
};

// Generate monthly bills
export const generateMonthlyBills = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.post('/billing/generate-monthly-bills');
    return response.data;
  } catch (error) {
    console.error('Error generating monthly bills:', error);
    throw error;
  }
};

// Suspend overdue customers
export const suspendOverdueCustomers = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.post('/billing/suspend-overdue');
    return response.data;
  } catch (error) {
    console.error('Error suspending overdue customers:', error);
    throw error;
  }
};

// Test suspend individual customer
export const testSuspendCustomer = async (customerId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.post(`/billing/test-suspend/${customerId}`);
    return response.data;
  } catch (error) {
    console.error('Error testing suspend customer:', error);
    throw error;
  }
};

// Test enable individual customer
export const testEnableCustomer = async (customerId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.post(`/billing/test-enable/${customerId}`);
    return response.data;
  } catch (error) {
    console.error('Error testing enable customer:', error);
    throw error;
  }
};

// Test suspend customer by name
export const testSuspendCustomerByName = async (customerName: string): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.post('/billing/test-suspend-by-name', { customerName });
    return response.data;
  } catch (error) {
    console.error('Error testing suspend customer by name:', error);
    throw error;
  }
};

// Test enable customer by name
export const testEnableCustomerByName = async (customerName: string): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.post('/billing/test-enable-by-name', { customerName });
    return response.data;
  } catch (error) {
    console.error('Error testing enable customer by name:', error);
    throw error;
  }
};

// PPP User Management API functions
// Disable PPP user
export const disablePPPUser = async (customerId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.post(`/customers/${customerId}/disable-ppp`);
    return response.data;
  } catch (error) {
    console.error('Error disabling PPP user:', error);
    throw error;
  }
};

// Enable PPP user
export const enablePPPUser = async (customerId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.post(`/customers/${customerId}/enable-ppp`);
    return response.data;
  } catch (error) {
    console.error('Error enabling PPP user:', error);
    throw error;
  }
};

// Check PPP user status
export const checkPPPUserStatus = async (customerId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.post(`/customers/${customerId}/check-ppp-status`);
    return response.data;
  } catch (error) {
    console.error('Error checking PPP user status:', error);
    throw error;
  }
};

// Dashboard API functions
export const getDashboardStats = async (month?: string): Promise<ApiResponse<any>> => {
  try {
    const url = month ? `/dashboard/stats?month=${month}` : '/dashboard/stats';
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      success: true,
      data: {
        totalCustomers: 0,
        activeCustomers: 0,
        suspendedCustomers: 0,
        totalRevenue: 0,
        pendingBills: 0
      },
      message: 'Using dummy data - backend not available'
    };
  }
};

// Export api object for compatibility
export const api = {
  // Router
  getRouters,
  createRouter,
  updateRouter,
  deleteRouter,
  testRouterConnection,
  
  // Area
  getAreas,
  createArea,
  updateArea,
  deleteArea,
  
  // ODP
  getODPs,
  createODP,
  updateODP,
  deleteODP,
  
  // Package
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
  
  // Customer
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  
  // Transaction
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  
  // MikroTik
  getPPPSecrets,
  
  // Billing
  triggerAutoSuspend,
  generateMonthlyBills,
  suspendOverdueCustomers,
  testSuspendCustomer,
  testEnableCustomer,
  testSuspendCustomerByName,
  testEnableCustomerByName,
  
  // Dashboard
  getDashboardStats
};

export default api;