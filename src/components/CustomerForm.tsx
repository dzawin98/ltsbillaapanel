import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Customer } from '@/types/isp';
import { useAreas } from '@/hooks/useAreas';
import { useRouters } from '@/hooks/useRouters';
import { useODP } from '@/hooks/useODP';
import { usePackages } from '@/hooks/usePackages';
import { toast } from 'sonner';

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (customer: Partial<Customer>) => void;
  onCancel: () => void;
}

// Fungsi helper untuk format tanggal
const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Fungsi helper untuk validasi tanggal
const isValidDate = (dateString: string | undefined | null): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString + 'T00:00:00');
  return !isNaN(date.getTime());
};

const safeFormatDate = (dateString: string | undefined | null): string => {
  if (!isValidDate(dateString)) return '';
  return format(new Date(dateString! + 'T00:00:00'), "dd/MM/yyyy");
};

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onSubmit, onCancel }) => {
  const { areas } = useAreas();
  const { routers } = useRouters();
  const { odp, loading: odpLoading, error: odpError } = useODP();
  const { packages } = usePackages();
  
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    idNumber: '',
    area: '',
    package: '',
    packagePrice: 0,
    addonPrice: 0,
    discount: 0,
    router: '',
    pppSecret: '',
    pppSecretType: 'none',
    odpSlot: '',
    odpId: '', // Tambahkan odpId untuk relasi ODP
    billingType: 'prepaid',
    activePeriod: 1,
    activePeriodUnit: 'months',
    installationStatus: 'not_installed',
    serviceStatus: 'inactive',
    mikrotikStatus: 'active',
    activeDate: formatDateToLocal(new Date()),
    billingStatus: customer?.billingStatus || (customer?.billingType === 'postpaid' ? 'belum_lunas' : 'lunas'),
    status: 'active',
    ...customer
  });

  const [pppSecrets, setPppSecrets] = useState<string[]>([]);
  const [loadingSecrets, setLoadingSecrets] = useState(false);
  const [pppSearchTerm, setPppSearchTerm] = useState('');

  // Filter PPP secrets based on search term
  const filteredPppSecrets = pppSecrets.filter(secret => 
    secret.toLowerCase().includes(pppSearchTerm.toLowerCase())
  );

  // Filter ODP yang tersedia (memiliki slot kosong)
  const availableODPs = odp.filter(odpItem => odpItem.availableSlots > 0);



  // Load customer data when editing
  useEffect(() => {
    if (customer) {
      // Convert router ID to router name for display
      let routerName = '';
      if (customer.router) {
        const router = routers.find(r => r.id === customer.router);
        routerName = router ? router.name : '';
      }
      
      setFormData({
        ...customer,
        router: routerName,
        activeDate: customer.activeDate ? customer.activeDate.split('T')[0] : formatDateToLocal(new Date()),
        expireDate: customer.expireDate ? customer.expireDate.split('T')[0] : '',
        paymentDueDate: customer.paymentDueDate ? customer.paymentDueDate.split('T')[0] : ''
      });
    }
  }, [customer, routers]);

  // Set default dates for new customers
  useEffect(() => {
    if (!customer) {
      const now = new Date();
      const activeDate = new Date(now.getFullYear(), now.getMonth(), 1); // Tanggal 1 bulan ini
      const paymentDueDate = new Date(now.getFullYear(), now.getMonth() + 1, 5); // Tanggal 5 bulan depan
      
      setFormData(prev => ({
        ...prev,
        activeDate: formatDateToLocal(activeDate),
        paymentDueDate: formatDateToLocal(paymentDueDate),
        installationStatus: 'installed', // Default terpasang
        serviceStatus: 'active' // Default aktif
      }));
    }
  }, [customer]);

  // Debug ODP data
  useEffect(() => {
    console.log('ODP Debug Info:', {
      odpLoading,
      odpError,
      odpCount: odp.length,
      availableODPsCount: availableODPs.length,
      odpData: odp,
      availableODPs
    });
  }, [odp, odpLoading, odpError, availableODPs]);

  // Load PPP Secrets when router is selected
  useEffect(() => {
    if (formData.router && formData.pppSecretType === 'existing') {
      const selectedRouter = routers.find(r => r.name === formData.router);
      if (selectedRouter) {
        loadPPPSecrets(selectedRouter.id.toString());
      }
    }
  }, [formData.router, formData.pppSecretType, routers]);

  // Update package price when package is selected
  useEffect(() => {
    if (formData.package) {
      const selectedPackage = packages.find(pkg => pkg.name === formData.package);
      if (selectedPackage) {
        setFormData(prev => ({ ...prev, packagePrice: selectedPackage.price }));
      }
    }
  }, [formData.package, packages]);

  // Calculate expire date when active date or period changes
  useEffect(() => {
    if (formData.activeDate && formData.activePeriod) {
      const activeDate = new Date(formData.activeDate + 'T00:00:00');
      const expireDate = new Date(activeDate);
      
      if (formData.activePeriodUnit === 'months') {
        expireDate.setMonth(expireDate.getMonth() + formData.activePeriod);
      } else {
        expireDate.setDate(expireDate.getDate() + formData.activePeriod);
      }
      
      setFormData(prev => ({ 
        ...prev, 
        expireDate: formatDateToLocal(expireDate)
      }));
    }
  }, [formData.activeDate, formData.activePeriod, formData.activePeriodUnit]);

  // Update billingStatus when billingType changes
  useEffect(() => {
    if (formData.billingType === 'prepaid') {
      setFormData(prev => ({ 
        ...prev, 
        billingStatus: 'lunas',
        status: 'active'
      }));
    } else if (formData.billingType === 'postpaid') {
      setFormData(prev => ({ 
        ...prev, 
        billingStatus: 'belum_lunas',
        status: 'active'
      }));
    }
  }, [formData.billingType]);

  // Function to get profile based on package
  const getProfileFromPackage = (packageName: string) => {
    const selectedPackage = packages.find(pkg => pkg.name === packageName);
    if (!selectedPackage) return 'default';
    
    // Use mikrotikProfile from package if available, otherwise fallback to speed-based profile
    return selectedPackage.mikrotikProfile || `${selectedPackage.downloadSpeed || 0}M-${selectedPackage.uploadSpeed || 0}M`;
  };

  // WhatsApp notification function
  const sendWhatsAppNotification = async (customerData: Partial<Customer>) => {
    const savedSettings = localStorage.getItem('customer-whatsapp-settings');
    if (!savedSettings) {
      console.log('No WhatsApp settings found for new customers');
      return;
    }

    let waSettings;
    try {
      waSettings = JSON.parse(savedSettings);
    } catch (error) {
      console.error('Failed to parse customer WhatsApp settings:', error);
      return;
    }

    if (!waSettings.enabled) {
      console.log('WhatsApp notifications disabled for new customers');
      return;
    }

    try {
      // Get WAHA config from localStorage
      const wahaConfigStr = localStorage.getItem('wahaConfig');
      if (!wahaConfigStr) {
        console.warn('WAHA config not found. Please configure WAHA settings in Messages page.');
        return;
      }

      const wahaConfig = JSON.parse(wahaConfigStr);

      // Format phone number (remove +, spaces, etc.)
      const formattedPhone = customerData.phone?.replace(/[^0-9]/g, '') || '';
      const chatId = formattedPhone.startsWith('62') ? 
        `${formattedPhone}@c.us` : 
        `62${formattedPhone.startsWith('0') ? formattedPhone.substring(1) : formattedPhone}@c.us`;

      // Replace placeholders in template
      let message = waSettings.newCustomerMessageTemplate
        .replace(/{customerName}/g, customerData.name || '')
        .replace(/{customerNumber}/g, customerData.customerNumber || '')
        .replace(/{packageName}/g, customerData.package || '')
        .replace(/{packagePrice}/g, (customerData.packagePrice || 0).toLocaleString('id-ID'))
        .replace(/{area}/g, customerData.area || '')
        .replace(/{activeDate}/g, customerData.activeDate ? new Date(customerData.activeDate).toLocaleDateString('id-ID') : '')
        .replace(/{expireDate}/g, customerData.expireDate ? new Date(customerData.expireDate).toLocaleDateString('id-ID') : '');

      console.log('Sending WhatsApp notification to new customer:', customerData.phone);
      console.log('Formatted chatId:', chatId);
      console.log('Message:', message);

      // Check session status first
      const sessionCheck = await fetch(`${wahaConfig.baseUrl}/api/sessions/${wahaConfig.session}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(wahaConfig.apiKey && { 'X-Api-Key': wahaConfig.apiKey })
        }
      });

      if (!sessionCheck.ok) {
        throw new Error(`Session ${wahaConfig.session} tidak tersedia atau tidak aktif`);
      }

      const sessionData = await sessionCheck.json();
      if (sessionData.status !== 'WORKING') {
        throw new Error(`Session status: ${sessionData.status}. Session harus dalam status WORKING`);
      }

      // Try multiple endpoints
      const endpoints = [
        `${wahaConfig.baseUrl}/api/sendText`,
        `${wahaConfig.baseUrl}/api/${wahaConfig.session}/sendText`,
        `${wahaConfig.baseUrl}/api/sessions/${wahaConfig.session}/chats/${chatId}/messages`,
        `${wahaConfig.baseUrl}/api/v1/sessions/${wahaConfig.session}/chats/${chatId}/messages/text`
      ];

      const payloads = [
        {
          session: wahaConfig.session,
          chatId: chatId,
          text: message
        },
        {
          chatId: chatId,
          text: message
        },
        {
          text: message
        },
        {
          text: message
        }
      ];

      // Try each endpoint until one succeeds
      for (let i = 0; i < endpoints.length; i++) {
        try {
          console.log(`Mencoba endpoint ${i + 1}: ${endpoints[i]}`);
          
          const response = await fetch(endpoints[i], {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(wahaConfig.apiKey && { 'X-Api-Key': wahaConfig.apiKey })
            },
            body: JSON.stringify(payloads[i])
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`WhatsApp notification sent successfully via endpoint ${i + 1}:`, result);
            toast.success(`Notifikasi WhatsApp berhasil dikirim ke ${customerData.name}`);
            return true;
          } else {
            console.log(`Endpoint ${i + 1} gagal:`, response.status, response.statusText);
          }
        } catch (endpointError) {
          console.log(`Error pada endpoint ${i + 1}:`, endpointError);
        }
      }

      throw new Error('Semua endpoint gagal. Periksa konfigurasi WAHA API.');
      
    } catch (error) {
      console.warn('WhatsApp notification failed:', error);
      toast.error('Gagal mengirim notifikasi WhatsApp');
      return false;
    }
  };

  const loadPPPSecrets = async (routerId: string) => {
    setLoadingSecrets(true);
    try {
      const response = await fetch(`http://localhost:3001/api/routers/${routerId}/ppp-secrets`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const secrets = await response.json();
          const secretNames = secrets.map((secret: any) => secret.name || secret);
          setPppSecrets(secretNames);
        } else {
          console.warn('PPP Secrets API not available - using manual input only');
          setPppSecrets([]);
        }
      } else {
        console.warn('PPP Secrets API endpoint not found - using manual input only');
        setPppSecrets([]);
      }
    } catch (error) {
      console.warn('PPP Secrets API not available - using manual input only:', error);
      setPppSecrets([]);
    } finally {
      setLoadingSecrets(false);
    }
  };
  
  // PPP Secret creation function has been removed due to API instability

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      alert('Nama dan telepon wajib diisi');
      return;
    }
    
    // PPP Secret validation removed due to API instability
    
    try {
      // PPP Secret creation has been removed due to API instability
      // Customer data will be saved without automatic PPP Secret creation
      
      // Convert router name to router ID
      const submitData = { ...formData };
      if (submitData.router) {
        const selectedRouter = routers.find(r => r.name === submitData.router);
        if (selectedRouter) {
          (submitData as any).routerId = selectedRouter.id;
          delete submitData.router;
        }
      }
      
      if (!customer) {
        const customerNumber = `LTS${Date.now().toString().slice(-6)}`;
        submitData.customerNumber = customerNumber;
      }
      
      if (!submitData.paymentDueDate) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        submitData.paymentDueDate = dueDate.toISOString().split('T')[0];
      }
      
      // Submit the customer data
      onSubmit(submitData);
      
      // Send WhatsApp notification for new customers only
      if (!customer && submitData.phone) {
        await sendWhatsAppNotification(submitData);
      }
      
    } catch (error: any) {
      console.error('Error in form submission:', error);
      alert('Terjadi kesalahan saat menyimpan data');
    }
  };

  const handleChange = (field: keyof Customer, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRouterChange = (routerName: string) => {
    setFormData(prev => ({ 
      ...prev, 
      router: routerName,
      pppSecret: ''
    }));
    setPppSecrets([]);
    
    if (formData.pppSecretType === 'existing') {
      const selectedRouter = routers.find(r => r.name === routerName);
      if (selectedRouter) {
        loadPPPSecrets(selectedRouter.id.toString());
      }
    }
  };

  const totalPrice = (formData.packagePrice || 0) + (formData.addonPrice || 0) - (formData.discount || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {customer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
          </h2>
          <p className="text-gray-600">
            {customer ? 'Ubah data pelanggan' : 'Masukkan data pelanggan baru'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Data Pelanggan */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nama Pelanggan *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="idNumber">No KTP (Opsional)</Label>
              <Input
                id="idNumber"
                value={formData.idNumber || ''}
                onChange={(e) => handleChange('idNumber', e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Telepon *</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="address">Alamat</Label>
            <Input
              id="address"
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>
          
          {/* Area & Router */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Wilayah / Area *</Label>
              <Select value={formData.area || undefined} onValueChange={(value) => handleChange('area', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih wilayah" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.name}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Router</Label>
              <Select 
                value={formData.router || undefined} 
                onValueChange={handleRouterChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih router" />
                </SelectTrigger>
                <SelectContent>
                  {routers.map((router) => (
                    <SelectItem key={router.id} value={router.name}>
                      {router.name} - {router.ipAddress}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Package */}
          <div>
            <Label>Paket Internet *</Label>
            <Select value={formData.package || undefined} onValueChange={(value) => handleChange('package', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih paket" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.name}>
                    {pkg.name} - {pkg.downloadSpeed}Mbps - Rp {pkg.price.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* ODP Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ODP (Optical Distribution Point)</Label>
              <Select 
                value={formData.odpId || undefined} 
                onValueChange={(value) => handleChange('odpId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih ODP" />
                </SelectTrigger>
                <SelectContent>
                  {odpLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : odpError ? (
                    <SelectItem value="error" disabled>Error loading ODP</SelectItem>
                  ) : availableODPs.length === 0 ? (
                    <SelectItem value="no-odp" disabled>Tidak ada ODP tersedia</SelectItem>
                  ) : (
                    availableODPs.map((odpItem) => (
                      <SelectItem key={odpItem.id} value={odpItem.id.toString()}>
                        {odpItem.name} - {odpItem.location} (Slot: {odpItem.availableSlots}/{odpItem.totalSlots})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="odpSlot">Slot ODP</Label>
              <Input
                id="odpSlot"
                value={formData.odpSlot || ''}
                onChange={(e) => handleChange('odpSlot', e.target.value)}
                placeholder="Nomor slot (opsional)"
              />
            </div>
          </div>
          
          {/* PPP Secret Configuration */}
          <div className="space-y-4">
            <div>
              <Label>Konfigurasi PPP Secret</Label>
              <Select 
                value={formData.pppSecretType || 'none'} 
                onValueChange={(value) => handleChange('pppSecretType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak menggunakan PPP Secret</SelectItem>
                  <SelectItem value="existing">Gunakan PPP Secret yang sudah ada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.pppSecretType === 'existing' && (
              <div>
                <Label htmlFor="pppSecret">PPP Secret</Label>
                <div className="space-y-2">
                  <Input
                    id="pppSecret"
                    value={formData.pppSecret || ''}
                    onChange={(e) => {
                      handleChange('pppSecret', e.target.value);
                      setPppSearchTerm(e.target.value);
                    }}
                    placeholder="Cari atau ketik nama PPP Secret..."
                  />
                  {loadingSecrets && (
                    <p className="text-sm text-gray-500">Loading PPP Secrets...</p>
                  )}
                  {filteredPppSecrets.length > 0 && (
                    <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                      {filteredPppSecrets.map((secret, index) => (
                        <div
                          key={index}
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                          onClick={() => {
                            handleChange('pppSecret', secret);
                            setPppSearchTerm('');
                          }}
                        >
                          {secret}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Periode Aktif */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="activePeriod">Periode Aktif</Label>
              <Input
                id="activePeriod"
                type="number"
                min="1"
                value={formData.activePeriod || 1}
                onChange={(e) => handleChange('activePeriod', parseInt(e.target.value) || 1)}
              />
            </div>
            
            <div>
              <Label>Satuan Periode</Label>
              <Select 
                value={formData.activePeriodUnit || 'months'} 
                onValueChange={(value) => handleChange('activePeriodUnit', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Hari</SelectItem>
                  <SelectItem value="months">Bulan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Status MikroTik</Label>
              <Select 
                value={formData.mikrotikStatus || 'active'} 
                onValueChange={(value) => handleChange('mikrotikStatus', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Tanggal */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Tanggal Aktif</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal pl-3",
                      !formData.activeDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 flex-shrink-0" />
                    {formData.activeDate && isValidDate(formData.activeDate) ? (
                      format(new Date(formData.activeDate + 'T00:00:00'), "dd/MM/yyyy")
                    ) : (
                      <span>Pilih tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={isValidDate(formData.activeDate) ? new Date(formData.activeDate + 'T00:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        handleChange('activeDate', formatDateToLocal(date));
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label>Tanggal Kadaluarsa</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal pl-3",
                      !formData.expireDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 flex-shrink-0" />
                    {formData.expireDate && isValidDate(formData.expireDate) ? (
                      format(new Date(formData.expireDate + 'T00:00:00'), "dd/MM/yyyy")
                    ) : (
                      <span>Pilih tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={isValidDate(formData.expireDate) ? new Date(formData.expireDate + 'T00:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        handleChange('expireDate', formatDateToLocal(date));
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label>Jatuh Tempo Pembayaran</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal pl-3",
                      !formData.paymentDueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 flex-shrink-0" />
                    {formData.paymentDueDate ? (
                      format(new Date(formData.paymentDueDate), "dd/MM/yyyy")
                    ) : (
                      <span>Pilih tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.paymentDueDate ? new Date(formData.paymentDueDate + 'T00:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        handleChange('paymentDueDate', formatDateToLocal(date));
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Pricing */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="packagePrice">Harga Paket</Label>
              <Input
                id="packagePrice"
                type="number"
                value={formData.packagePrice || 0}
                onChange={(e) => handleChange('packagePrice', parseInt(e.target.value) || 0)}
                readOnly
              />
            </div>
            
            <div>
              <Label htmlFor="addonPrice">Harga Addon</Label>
              <Input
                id="addonPrice"
                type="number"
                value={formData.addonPrice || 0}
                onChange={(e) => handleChange('addonPrice', parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div>
              <Label htmlFor="discount">Diskon</Label>
              <Input
                id="discount"
                type="number"
                value={formData.discount || 0}
                onChange={(e) => handleChange('discount', parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div>
              <Label>Total Harga</Label>
              <Input
                value={`Rp ${totalPrice.toLocaleString()}`}
                readOnly
                className="font-semibold"
              />
            </div>
          </div>
          
          {/* Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status Pemasangan</Label>
              <Select 
                value={formData.installationStatus || 'not_installed'} 
                onValueChange={(value) => handleChange('installationStatus', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_installed">Belum Terpasang</SelectItem>
                  <SelectItem value="installed">Terpasang</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Status Aktif</Label>
              <Select 
                value={formData.serviceStatus || 'inactive'} 
                onValueChange={(value) => handleChange('serviceStatus', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inactive">Tidak Aktif</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Tipe Billing */}
          <div>
            <Label>Tipe Billing</Label>
            <Select 
              value={formData.billingType || 'prepaid'} 
              onValueChange={(value) => handleChange('billingType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prepaid">Prepaid</SelectItem>
                <SelectItem value="postpaid">Postpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          
          <div>
            <Label htmlFor="notes">Catatan</Label>
            <Input
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Catatan tambahan..."
            />
          </div>
          
          <div className="flex gap-2">
            <Button type="submit">
              {customer ? 'Update' : 'Simpan'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Batal
            </Button>
          </div>
        </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerForm;
