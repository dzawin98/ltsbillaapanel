
// Ubah semua interface untuk menggunakan string | number untuk ID
export interface RouterDevice {
  id: string | number;
  name: string;
  ipAddress: string; // Change from 'ip' to 'ipAddress'
  port: number;
  username: string;
  password: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  lastSeen: string;
  area: string;
  model?: string;
  firmware?: string;
  uptime?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Area {
  id: string | number;
  name: string;
  description: string;
  routerCount: number;
  customerCount: number;
  status: 'active' | 'maintenance' | 'inactive';
  coverage?: string;
  revenue?: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id?: string;
  customerNumber: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  idNumber: string;
  area: string;
  package: string;
  packagePrice: number;
  addonPrice?: number;
  discount?: number;
  pppSecret?: string;
  pppSecretType: 'existing' | 'none';
  odpSlot?: string;
  odpId?: string; // Field untuk relasi dengan ODP
  odpData?: ODP; // Data ODP yang terkait
  router?: string;
  routerData?: RouterDevice; // Data Router yang terkait
  billingType: 'prepaid' | 'postpaid';
  activePeriod: number;
  activePeriodUnit: 'days' | 'months';
  installationStatus: 'not_installed' | 'installed';
  serviceStatus: 'active' | 'inactive';
  activeDate: string;
  expireDate: string;
  paymentDueDate: string;
  status: 'active' | 'suspended' | 'terminated' | 'pending';
  isIsolated: boolean;
  routerName?: string;
  notes?: string;
  // Field billing baru
  billingStatus: 'belum_lunas' | 'lunas' | 'suspend';
  lastBillingDate?: string;
  nextBillingDate?: string;
  mikrotikStatus: 'active' | 'disabled';
  lastSuspendDate?: string;
  // Field prorata
  isProRataApplied?: boolean;
  proRataAmount?: number;
  createdAt: string;
  updatedAt: string;
  // pppPassword field removed due to API instability
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  downloadSpeed: number; // Add this property
  uploadSpeed: number;   // Add this property
  speed?: string;        // Keep this for display purposes
  bandwidth?: {          // Make this optional since we have downloadSpeed/uploadSpeed
    download: number;
    upload: number;
  };
  price: number;
  duration: number; // in days
  mikrotikProfile: string;
  routerName?: string;
  isActive: boolean;
  allowUpgradeDowngrade: boolean; // Add this property
  onlineRegistration: boolean;    // Add this property
  taxPercentage: number;          // Add this property
  agentCommission: number;        // Add this property
  createdAt: Date;
  updatedAt: Date;
}

export interface ODP {
  id: string;
  name: string;
  location: string;
  area: string;
  totalSlots: number;
  usedSlots: number;
  availableSlots: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  status: 'active' | 'maintenance' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface AddonItem {
  id: string;
  customerId: string;
  itemName: string;
  itemType: 'one_time' | 'monthly';
  price: number;
  quantity: number;
  description?: string;
  isPaid: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionBreakdown {
  package: {
    name: string;
    price: number;
    isProRata: boolean;
    proRataInfo?: {
      amount: number;
      remainingDays: number;
      totalDaysInMonth: number;
      startDate: string;
      endDate: string;
    };
  };
  monthlyAddons: Array<{
    name: string;
    price: number;
    quantity: number;
    total: number;
  }>;
  oneTimeItems: Array<{
    name: string;
    price: number;
    quantity: number;
    total: number;
  }>;
  discount: number;
  totals: {
    package: number;
    monthlyAddons: number;
    oneTimeItems: number;
    legacyAddon: number;
    discount: number;
    grandTotal: number;
  };
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  type: 'payment' | 'penalty' | 'discount' | 'refund';
  method: 'cash' | 'transfer' | 'digital_wallet' | 'other';
  description: string;
  period: {
    from: Date;
    to: Date;
  };
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  paidAt?: Date;
  dueDate: Date;
  receiptNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  breakdown?: string; // JSON string of TransactionBreakdown
}

export interface ProRataCalculation {
  isProRataApplied: boolean;
  proRataAmount: number;
  remainingDays: number;
  daysInMonth: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency?: number;
  routerInfo?: {
    model?: string;
    version?: string;
    uptime?: string;
  };
}

export interface MikrotikProfile {
  name: string;
  rateLimit: string;
  remoteAddress?: string;
  localAddress?: string;
  onlyOne?: boolean;
}

export interface PPPSecret {
  name: string;
  password: string;
  service: string;
  profile: string;
  localAddress?: string;
  remoteAddress?: string;
  disabled?: boolean;
}

// Form types
export interface RouterFormData {
  name: string;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  area: string;
}

export interface AreaFormData {
  name: string;
  description: string;
  coverage?: string;
}

export interface CustomerFormData {
  customerNumber?: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  idNumber?: string;
  area: string;
  package: string;
  packagePrice: number;
  addonPrice?: number;
  discount?: number;
  pppSecret?: string;
  pppSecretType: 'none' | 'existing';
  router?: string;
  odpSlot?: string;
  billingType: 'prepaid' | 'postpaid';
  activePeriod: number;
  activePeriodUnit: 'days' | 'months';
  installationStatus: 'not_installed' | 'installed';
  serviceStatus: 'active' | 'inactive';
  activeDate?: string;
  expireDate?: string;
  paymentDueDate?: string;
  notes?: string;
}

// Dashboard stats
export interface DashboardStats {
  totalRouters: number;
  onlineRouters: number;
  totalAreas: number;
  totalCustomers: number;
  activeCustomers: number;
  suspendedCustomers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  overduePayments: number;
  pendingBills: number;
}

export interface BillingStats {
  totalTransactions: number;
  totalPaidAmount: number;
  totalCash: number;
  totalTransfer: number;
  paidCount: number;
  cashCount: number;
  transferCount: number;
}

export interface AddonFormData {
  itemName: string;
  itemType: 'one_time' | 'monthly';
  price: number;
  quantity: number;
  description?: string;
}

// Dan seterusnya untuk semua interface
