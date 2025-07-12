import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Download, Eye, Send, Trash2, Copy, Settings, DollarSign, FileText, Banknote, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { useCustomers } from '@/hooks/useCustomers';
import { useAreas } from '@/hooks/useAreas';
import { usePackages } from '@/hooks/usePackages';
import { Transaction, Customer } from '@/types/isp';
import { toast } from 'sonner';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, updateCustomer } from '@/utils/api';


interface TransactionFormData {
  customerId: string;
  amount: number;
  type: 'payment' | 'penalty' | 'discount' | 'refund';
  method: 'cash' | 'transfer' | 'digital_wallet' | 'other';
  description: string;
  period: {
    from: string;
    to: string;
  };
  notes?: string;
  // Add missing properties
  customerSearch: string;
  selectedCustomer: Customer | null;
  paymentDate: string;
  paymentPeriod: {
    from: string;
    to: string;
  };
  paymentMethod: string;
  receivedBy: string;
  packagePrice: number;
  addonPrice: number;
  discount: number;
  totalAmount: number;
  ppn: number;
  grandTotal: number;
}

interface WhatsAppSettings {
  paymentMessageTemplate: string;
  receiptMessageTemplate: string;
  enabled: boolean;
}

const Transactions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  
  // Filter states
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Helper function untuk mendapatkan tanggal dalam timezone Jakarta
  const getJakartaDate = (date?: Date) => {
    const now = date || new Date();
    // Gunakan Intl.DateTimeFormat untuk mendapatkan waktu Jakarta yang akurat
    const jakartaTimeString = now.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' });
    return new Date(jakartaTimeString);
  };

  const formatDateForInput = (date: Date) => {
    // Format YYYY-MM-DD untuk input date
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Form data
  const [formData, setFormData] = useState<TransactionFormData>(() => {
    const today = getJakartaDate();
    
    // Buat tanggal 1 bulan ini dan 1 bulan depan dalam timezone Jakarta
    const fromDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const toDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    
    console.log('=== INITIAL FORM DATA (Jakarta Time) ===');
    console.log('Today Jakarta:', today.toISOString());
    console.log('FromDate:', fromDate.toISOString());
    console.log('ToDate:', toDate.toISOString());
    console.log('FromDate formatted:', formatDateForInput(fromDate));
    console.log('ToDate formatted:', formatDateForInput(toDate));
    
    return {
      customerId: '',
      amount: 0,
      type: 'payment',
      method: 'cash',
      description: '',
      period: {
        from: '',
        to: ''
      },
      notes: '',
      customerSearch: '',
      selectedCustomer: null,
      paymentDate: formatDateForInput(today),
      paymentPeriod: {
        from: formatDateForInput(fromDate),
        to: formatDateForInput(toDate)
      },
      paymentMethod: 'TUNAI',
      receivedBy: 'Dzawin Nuha',
      packagePrice: 0,
      addonPrice: 0,
      discount: 0,
      totalAmount: 0,
      ppn: 0,
      grandTotal: 0
    };
  });
  
  // WhatsApp settings
  const [waSettings, setWaSettings] = useState<WhatsAppSettings>({
    paymentMessageTemplate: `Halo {customerName},

Pembayaran internet Anda telah berhasil diproses.

Detail Pembayaran:
📋 No. Pelanggan: {customerNumber}
💰 Jumlah: Rp {amount}
📅 Periode: {period}
🧾 No. Nota: {receiptNumber}

Terima kasih atas pembayaran Anda.

🔗 Lihat Nota: {receiptUrl}

Salam,
LATANSA NETWORKS`,
    receiptMessageTemplate: `📄 Nota Pembayaran

Pelanggan: {customerName}
No. Pelanggan: {customerNumber}
Jumlah: Rp {amount}
Tanggal: {paymentDate}

🔗 {receiptUrl}`,
    enabled: true
  });
  
  // Hooks
  const { customers } = useCustomers();
  const { areas } = useAreas();
  const { packages } = usePackages();
  
  // Helper functions
  const searchCustomers = (searchTerm: string) => {
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.pppSecret.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10); // Limit to 10 results
  };
    const handleCustomerSelect = (customer: Customer) => {
    const today = getJakartaDate();
    
    // DEFAULT: Selalu gunakan tanggal 1 bulan ini sampai tanggal 1 bulan depan
    const fromDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const toDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    
    console.log('=== HANDLE CUSTOMER SELECT (Jakarta Time) ===');
    console.log('Today Jakarta:', today.toISOString());
    console.log('FromDate:', fromDate.toISOString());
    console.log('ToDate:', toDate.toISOString());
    console.log('FromDate formatted:', formatDateForInput(fromDate));
    console.log('ToDate formatted:', formatDateForInput(toDate));
    console.log('Customer:', customer.name);
    
    // Calculate totals without decimals
    const packagePrice = Math.round(customer.packagePrice || 0);
    const addonPrice = Math.round(customer.addonPrice || 0);
    const discount = Math.round(customer.discount || 0);
    const totalAmount = packagePrice + addonPrice - discount;
    const ppnAmount = 0;
    const grandTotal = totalAmount + ppnAmount;
    
    setFormData(prev => {
        const newData = {
            ...prev,
            selectedCustomer: customer,
            customerSearch: `${customer.customerNumber} - ${customer.name}`,
            customerId: customer.id,
            packagePrice,
            addonPrice,
            discount,
            totalAmount,
            ppn: ppnAmount,
            grandTotal,
            paymentDate: formatDateForInput(today),
            paymentPeriod: {
                from: formatDateForInput(fromDate),
                to: formatDateForInput(toDate)
            }
        };
        
        console.log('New formData.paymentPeriod:', newData.paymentPeriod);
        return newData;
    });
  };
  
  // Mock transactions data - replace with actual API call
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  useEffect(() => {
    // Load WhatsApp settings from localStorage
    const savedSettings = localStorage.getItem('whatsapp-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setWaSettings(parsed);
      } catch (error) {
        console.error('Failed to parse WhatsApp settings:', error);
      }
    }
    
    // Load mock transactions
    loadTransactions();
  }, []);
  
  const loadTransactions = async () => {
    try {
      const response = await getTransactions();
      if (response.success) {
        setTransactions(response.data);
      } else {
        console.error('Failed to load transactions:', response.error);
        // Fallback to empty array if API fails
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };
  

  
  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => {
        const parentValue = prev[parent as keyof TransactionFormData];
        // Pastikan parentValue adalah object sebelum melakukan spread
        if (typeof parentValue === 'object' && parentValue !== null) {
          return {
            ...prev,
            [parent]: {
              ...parentValue,
              [child]: value
            }
          };
        }
        // Fallback jika parentValue bukan object
        return {
          ...prev,
          [parent]: {
            [child]: value
          }
        };
      });
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };
  
  const generateReceiptUrl = (receiptNumber: string, autoPdf: boolean = false) => {
    return `http://localhost/nota-pdf/nota.php?receiptNumber=${receiptNumber}`;
  };
  
  const replaceMessagePlaceholders = (template: string, transaction: Transaction, customer: Customer) => {
    return template
      .replace(/{customerName}/g, customer.name)
      .replace(/{customerNumber}/g, customer.customerNumber)
      .replace(/{amount}/g, transaction.amount.toString())
      .replace(/{amount:,}/g, transaction.amount.toLocaleString('id-ID'))
      .replace(/{period}/g, `${new Date(transaction.period.from).toLocaleDateString('id-ID')} - ${new Date(transaction.period.to).toLocaleDateString('id-ID')}`)
      .replace(/{receiptNumber}/g, transaction.receiptNumber || '')
      .replace(/{paymentDate}/g, new Date(transaction.paidAt || transaction.createdAt).toLocaleDateString('id-ID'))
      .replace(/{receiptUrl}/g, generateReceiptUrl(transaction.receiptNumber || ''));
  };
  
  const sendWhatsAppNotification = async (transaction: Transaction, customer: Customer) => {
    if (!waSettings.enabled) {
      console.log('WhatsApp notifications disabled');
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
      const formattedPhone = customer.phone.replace(/[^0-9]/g, '');
      const chatId = formattedPhone.startsWith('62') ? 
        `${formattedPhone}@c.us` : 
        `62${formattedPhone.startsWith('0') ? formattedPhone.substring(1) : formattedPhone}@c.us`;
      
      // Generate receipt URL
      const receiptUrl = generateReceiptUrl(transaction.receiptNumber || '');
      
      // Prepare period text
      let periodText;
      if (!transaction.period || !transaction.period.from || !transaction.period.to) {
        console.warn('Transaction period data is incomplete:', transaction.period);
        periodText = 'Periode tidak tersedia';
      } else {
        periodText = `${new Date(transaction.period.from).toLocaleDateString('id-ID')} - ${new Date(transaction.period.to).toLocaleDateString('id-ID')}`;
      }
      
      // Replace placeholders in template
      let message = waSettings.paymentMessageTemplate
        .replace(/{customerName}/g, customer.name)
        .replace(/{customerNumber}/g, customer.customerNumber || '')
        .replace(/{packageName}/g, customer.package || '')
        .replace(/{amount}/g, transaction.amount.toLocaleString('id-ID'))
        .replace(/{period}/g, periodText)
        .replace(/{receiptNumber}/g, transaction.receiptNumber || '')
        .replace(/{receiptUrl}/g, receiptUrl);
      
      console.log('Sending WhatsApp notification to:', customer.phone);
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
            toast.success(`Notifikasi WhatsApp berhasil dikirim ke ${customer.name}`);
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
    const generateReceiptNumber = (existingTransactions: Transaction[]): string => {
    // Ambil semua receiptNumber yang sudah ada dengan format LTS dan extract nomor urut
    const existingNumbers = existingTransactions
      .map(t => t.receiptNumber)
      .filter(rn => rn && rn.match(/^LTS\d+$/)) // Filter format LTS diikuti angka
      .map(rn => parseInt(rn!.replace('LTS', ''), 10)) // Hapus prefix LTS dan ambil angkanya
      .filter(num => !isNaN(num)); // Filter yang valid

    // Cari nomor urut berikutnya
    let nextNumber = 1;
    while (existingNumbers.includes(nextNumber)) {
      nextNumber++;
    }

    // Tentukan jumlah digit berdasarkan jumlah transaksi yang ada
    let digits = 3; // Minimum 3 digit untuk LTS001
    const maxExisting = Math.max(0, ...existingNumbers);
    
    if (maxExisting >= 10000) {
      digits = 5; // 5 digit untuk puluhan ribu (LTS10000-LTS99999)
    } else if (maxExisting >= 1000) {
      digits = 4; // 4 digit untuk ribuan (LTS1000-LTS9999)
    }
    
    // Pastikan nextNumber juga mengikuti aturan digit yang sama
    if (nextNumber >= 10000) {
      digits = Math.max(digits, 5);
    } else if (nextNumber >= 1000) {
      digits = Math.max(digits, 4);
    }

    // Format dengan awalan LTS dan leading zero sesuai jumlah digit
    return `LTS${nextNumber.toString().padStart(digits, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.selectedCustomer) return;

    setIsLoading(true);
    try {
        const customer = formData.selectedCustomer;
        const today = new Date();
        
        // Gunakan periode yang sudah dihitung di handleCustomerSelect
        // JANGAN hitung ulang di sini untuk menghindari inkonsistensi
        const fromDate = new Date(formData.paymentPeriod.from);
        const toDate = new Date(formData.paymentPeriod.to);
        
        // Tanggal expire customer = toDate
        const newExpireDate = toDate;
        
        // Payment due date = tanggal 5 bulan setelah toDate
        const newPaymentDueDate = new Date(toDate);
        newPaymentDueDate.setDate(5);

        // Buat transaksi baru
        const newTransaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
            customerId: customer.id,
            customerName: customer.name,
            amount: formData.grandTotal,
            type: 'payment',
            method: formData.paymentMethod.toLowerCase() === 'tunai' ? 'cash' : 'transfer',
            description: `Pembayaran ${customer.package} - ${fromDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
            receiptNumber: generateReceiptNumber(transactions),
            status: 'paid',
            paidAt: new Date(formData.paymentDate),
            dueDate: newPaymentDueDate,
            period: {
                from: fromDate,
                to: toDate
            },
            notes: formData.notes
        };

        // Simpan transaksi
        const response = await createTransaction(newTransaction);
        if (response.success) {
            // Update customer
            const updatedCustomer = {
                ...customer,
                status: 'active' as const,
                billingStatus: 'lunas' as const,
                serviceStatus: 'active' as const,
                mikrotikStatus: 'active' as const,
                activeDate: fromDate.toISOString(),
                expireDate: newExpireDate.toISOString(),
                paymentDueDate: newPaymentDueDate.toISOString(),
                lastPaymentDate: new Date().toISOString(),
                nextBillingDate: newPaymentDueDate.toISOString(),
                lastSuspendDate: null,
                isIsolated: false
            };

            await updateCustomer(customer.id, updatedCustomer);
            
            // TODO: Aktifkan kembali PPP Secret di MikroTik
            // await mikrotikAPI.enablePPPSecret(customer.router, customer.pppSecret);
        
        // Reload data
        await loadTransactions();
        
        // Hapus bagian preview - langsung tutup form
        setShowAddForm(false);
        
        // Reset form
        setFormData({
          customerId: '',
          amount: 0,
          type: 'payment',
          method: 'cash',
          description: '',
          period: { from: '', to: '' },
          notes: '',
          customerSearch: '',
          selectedCustomer: null,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentPeriod: { from: '', to: '' },
          paymentMethod: 'TUNAI',
          receivedBy: 'Dzawin Nuha',
          packagePrice: 0,
          addonPrice: 0,
          discount: 0,
          totalAmount: 0,
          ppn: 0,
          grandTotal: 0
        });

        // Send WhatsApp notification dan tampilkan notifikasi hasil
        if (waSettings.enabled) {
          try {
            await sendWhatsAppNotification(response.data, customer);
            toast.success('Pembayaran berhasil disimpan dan notifikasi WhatsApp berhasil dikirim!');
          } catch (whatsappError) {
            console.error('Error sending WhatsApp notification:', whatsappError);
            toast.success('Pembayaran berhasil disimpan, tetapi gagal mengirim notifikasi WhatsApp');
          }
        } else {
          toast.success('Pembayaran berhasil disimpan!');
        }
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Gagal menyimpan pembayaran');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const customer = customers.find(c => c.id === transaction.customerId);
    if (!customer) return false;
    
    // Search filter
    const searchMatch = !searchTerm || 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.pppSecret.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Payment method filter
    const methodMatch = paymentMethodFilter === 'all' || transaction.method === paymentMethodFilter;
    
    // Area filter
    const areaMatch = areaFilter === 'all' || customer.area === areaFilter;
    
    // Package filter
    const packageMatch = packageFilter === 'all' || customer.package === packageFilter;
    
    // Date filter
    const dateMatch = (!dateFrom || new Date(transaction.createdAt) >= new Date(dateFrom)) &&
                     (!dateTo || new Date(transaction.createdAt) <= new Date(dateTo));
    
    return searchMatch && methodMatch && areaMatch && packageMatch && dateMatch;
  });
  
  const handleDelete = async (transactionId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
    
    try {
      // Hapus dari database terlebih dahulu
      const response = await fetch(`http://localhost:3001/api/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Jika berhasil dihapus dari database, hapus dari state lokal
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
        toast.success('Transaksi berhasil dihapus');
      } else {
        throw new Error('Gagal menghapus transaksi dari database');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Gagal menghapus transaksi');
    }
  };
  
  const handlePrintReceipt = (transaction: Transaction) => {
    // Langsung buka URL nota PDF di tab baru
    const url = generateReceiptUrl(transaction.receiptNumber || '');
    window.open(url, '_blank');
  };
  
  const handleResendNotification = async (transaction: Transaction) => {
    const customer = customers.find(c => c.id === transaction.customerId);
    if (customer) {
      await sendWhatsAppNotification(transaction, customer);
    }
  };
  
  const saveWhatsAppSettings = () => {
    localStorage.setItem('whatsapp-settings', JSON.stringify(waSettings));
    setShowSettingsDialog(false);
    toast.success('Pengaturan WhatsApp berhasil disimpan');
  };
  
  const exportData = () => {
    const csvContent = [
      ['Tanggal', 'No. Pelanggan', 'Nama', 'Area', 'Paket', 'Jumlah', 'Metode', 'No. Nota'].join(','),
      ...filteredTransactions.map(transaction => {
        const customer = customers.find(c => c.id === transaction.customerId);
        return [
          new Date(transaction.createdAt).toLocaleDateString('id-ID'),
          customer?.customerNumber || '',
          customer?.name || '',
          customer?.area || '',
          customer?.package || '',
          transaction.amount,
          transaction.method,
          transaction.receiptNumber || ''
        ].join(',');
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaksi-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const copyReceiptUrl = (receiptNumber: string) => {
    const url = generateReceiptUrl(receiptNumber);
    navigator.clipboard.writeText(url);
    toast.success('Link nota berhasil disalin!');
  };

  const handlePrintInvoice = () => {
    if (selectedTransaction) {
      const url = generateReceiptUrl(selectedTransaction.receiptNumber, true);
      window.open(url, '_blank');
    }
  };

  const handleDownloadInvoice = () => {
    if (selectedTransaction) {
      const url = generateReceiptUrl(selectedTransaction.receiptNumber, true);
      window.open(url, '_blank');
    }
  };

  const handleCopyInvoiceLink = () => {
    if (selectedTransaction) {
      const url = generateReceiptUrl(selectedTransaction.receiptNumber, true);
      navigator.clipboard.writeText(url);
      toast.success('Link invoice berhasil disalin!');
    }
  };



  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaksi Pembayaran Tagihan</h1>
          <p className="text-gray-600">Pengelolaan data pembayaran tagihan pelanggan</p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Setting WhatsApp
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Pengaturan Format Pesan WhatsApp</DialogTitle>
                <DialogDescription>
                  Atur template pesan untuk notifikasi pembayaran dan nota
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Template Pesan Pembayaran</Label>
                  <Textarea
                    value={waSettings.paymentMessageTemplate}
                    onChange={(e) => setWaSettings(prev => ({ ...prev, paymentMessageTemplate: e.target.value }))}
                    rows={10}
                    placeholder="Template pesan untuk notifikasi pembayaran..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Placeholder: {'{customerName}'}, {'{customerNumber}'}, {'{packageName}'}, {'{amount}'}, {'{period}'}, {'{receiptNumber}'}, {'{receiptUrl}'}
                  </p>
                </div>
                <div>
                  <Label>Template Pesan Nota</Label>
                  <Textarea
                    value={waSettings.receiptMessageTemplate}
                    onChange={(e) => setWaSettings(prev => ({ ...prev, receiptMessageTemplate: e.target.value }))}
                    rows={6}
                    placeholder="Template pesan untuk pengiriman nota..."
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="wa-enabled"
                    checked={waSettings.enabled}
                    onChange={(e) => setWaSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <Label htmlFor="wa-enabled">Aktifkan notifikasi WhatsApp</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>Batal</Button>
                  <Button onClick={saveWhatsAppSettings}>Simpan</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter & Controls Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filter & Pencarian</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Baris 1: Button Pembayaran Baru, Pencarian, Export */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Pembayaran Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl w-[50vw] max-h-[80vh] h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Transaksi Pembayaran Tagihan</DialogTitle>
                  <DialogDescription>
                    Masukkan data pembayaran tagihan pelanggan
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Customer Search - Improved with reset functionality */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Pilih Pelanggan</Label>
                    <div className="relative">
                      <Input
                        value={formData.customerSearch}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, customerSearch: e.target.value }));
                        }}
                        placeholder="Ketik nama, nopel, atau ppp secret..."
                        className="w-full"
                        autoFocus
                        disabled={!!formData.selectedCustomer}
                      />
                      {formData.selectedCustomer && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              selectedCustomer: null,
                              customerSearch: '',
                              packagePrice: 0,
                              addonPrice: 0,
                              discount: 0,
                              totalAmount: 0,
                              ppn: 0,
                              grandTotal: 0
                            }));
                          }}
                        >
                          Ganti Pelanggan
                        </Button>
                      )}
                      {formData.customerSearch && !formData.selectedCustomer && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {searchCustomers(formData.customerSearch).map(customer => (
                            <div
                              key={customer.id}
                              className="p-3 hover:bg-gray-100 cursor-pointer border-b"
                              onClick={() => handleCustomerSelect(customer)}
                            >
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-gray-500">
                                {customer.customerNumber} • {customer.pppSecret} • {customer.area} • {customer.package}
                              </div>
                            </div>
                          ))}
                          {searchCustomers(formData.customerSearch).length === 0 && (
                            <div className="p-3 text-gray-500 text-center">
                              Tidak ada pelanggan yang ditemukan
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Details - Enhanced with confirmation */}
                  {formData.selectedCustomer && (
                    <>
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-green-800">✓ Pelanggan Terpilih</h3>
                          <Badge variant="secondary" className="bg-green-600 text-white">
                            {formData.selectedCustomer.customerNumber}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Nama:</span> 
                            <span className="font-medium ml-1">{formData.selectedCustomer.name}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">No. Pelanggan:</span> 
                            <span className="font-medium ml-1">{formData.selectedCustomer.customerNumber}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Area:</span> 
                            <span className="font-medium ml-1">{formData.selectedCustomer.area}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Paket:</span> 
                            <span className="font-medium ml-1">{formData.selectedCustomer.package}</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Tanggal Pembayaran</Label>
                          <Input
                            type="date"
                            value={formData.paymentDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Metode Pembayaran</Label>
                          <Select value={formData.paymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TUNAI">TUNAI</SelectItem>
                              <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Payment Period dengan Helper Text */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Periode Dari</Label>
                          <Input
                            type="date"
                            value={formData.paymentPeriod.from}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              paymentPeriod: { ...prev.paymentPeriod, from: e.target.value }
                            }))}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Default: Tanggal 1 bulan ini
                          </p>
                        </div>
                        <div>
                          <Label>Periode Sampai</Label>
                          <Input
                            type="date"
                            value={formData.paymentPeriod.to}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              paymentPeriod: { ...prev.paymentPeriod, to: e.target.value }
                            }))}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Default: Tanggal 1 bulan depan
                          </p>
                        </div>
                      </div>

                      {/* Payment Calculation */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Rincian Pembayaran</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Harga Paket:</span>
                            <span>Rp {formData.packagePrice.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Addon:</span>
                            <span>Rp {formData.addonPrice.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Diskon:</span>
                            <span>- Rp {formData.discount.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>PPN:</span>
                            <span>Rp {formData.ppn.toLocaleString('id-ID')}</span>
                          </div>
                          <hr />
                          <div className="flex justify-between font-bold">
                            <span>Total Bayar:</span>
                            <span>Rp {formData.grandTotal.toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Received By */}
                      <div>
                        <Label>Diterima Oleh</Label>
                        <Select value={formData.receivedBy} onValueChange={(value) => setFormData(prev => ({ ...prev, receivedBy: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Dzawin Nuha">Dzawin Nuha</SelectItem>
                            <SelectItem value="Latansa Networks">Latansa Networks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Notes */}
                      <div>
                        <Label>Tambahkan Keterangan / Catatan Pembayaran</Label>
                        <Textarea
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Catatan tambahan..."
                          rows={3}
                        />
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>BATAL</Button>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                          {isLoading ? 'Menyimpan...' : 'BAYAR'}
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              </DialogContent>
            </Dialog>

            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari nama, nopel, ppp secret, keterangan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button variant="outline" className="bg-green-500 text-white hover:bg-green-600" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>

          {/* Baris 2: Filter Tanggal */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Tanggal:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
              <span className="text-sm">s/d</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          {/* Baris 3: Filter Dropdown */}
          <div className="flex flex-wrap gap-4">
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Jenis Pembayaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Pembayaran</SelectItem>
                <SelectItem value="cash">Tunai</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Wilayah" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Wilayah</SelectItem>
                {areas.map(area => (
                  <SelectItem key={area.id} value={area.name}>{area.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={packageFilter} onValueChange={setPackageFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Paket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Paket</SelectItem>
                {packages.map(pkg => (
                  <SelectItem key={pkg.id} value={pkg.name}>{pkg.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics - Fixed without "k" suffix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Total Transaksi */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-blue-600">{filteredTransactions.length}</div>
                <div className="text-xs text-gray-500">Total Transaksi</div>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Pembayaran */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-green-600">
                  {Math.round(
                    filteredTransactions
                      .filter(t => t.status === 'paid')
                      .reduce((sum, t) => sum + (parseFloat(t.amount?.toString() || '0') || 0), 0)
                  ).toLocaleString('id-ID')}
                </div>
                <div className="text-xs text-gray-500">
                  {filteredTransactions.filter(t => t.status === 'paid').length} transaksi lunas
                </div>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pembayaran Tunai */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-purple-600">
                  {filteredTransactions.filter(t => t.method === 'cash').length}
                </div>
                <div className="text-xs text-gray-500">Pembayaran Tunai</div>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Banknote className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pembayaran Transfer */}
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {filteredTransactions.filter(t => t.method === 'transfer').length}
                </div>
                <div className="text-xs text-gray-500">Pembayaran Transfer</div>
              </div>
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table - Same style as Customers page */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 whitespace-nowrap">No</TableHead>
                  <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                  <TableHead className="whitespace-nowrap">No. Pelanggan</TableHead>
                  <TableHead className="whitespace-nowrap">Nama Pelanggan</TableHead>
                  <TableHead className="whitespace-nowrap">Area</TableHead>
                  <TableHead className="whitespace-nowrap">Paket</TableHead>
                  <TableHead className="whitespace-nowrap">Jumlah</TableHead>
                  <TableHead className="whitespace-nowrap">Metode</TableHead>
                  <TableHead className="whitespace-nowrap">No. Nota</TableHead>
                  <TableHead className="whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Tidak ada data transaksi
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction, index) => {
                    const customer = customers.find(c => c.id === transaction.customerId);
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">{index + 1}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {new Date(transaction.createdAt).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          <Badge variant="secondary" className="bg-purple-600 text-white">
                            {customer?.customerNumber}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{customer?.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{customer?.area}</TableCell>
                        <TableCell className="whitespace-nowrap">{customer?.package}</TableCell>
                        <TableCell className="font-semibold whitespace-nowrap">
                          Rp {transaction.amount.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge 
                            variant={transaction.method === 'cash' ? 'default' : 'secondary'}
                            className={transaction.method === 'cash' ? 'bg-green-600' : 'bg-blue-600'}
                          >
                            {transaction.method === 'cash' ? 'Tunai' : 'Transfer'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{transaction.receiptNumber}</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyReceiptUrl(transaction.receiptNumber || '')}
                              title="Copy Link Nota"
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintReceipt(transaction)}
                              title="Lihat/Print Nota"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendNotification(transaction)}
                              title="Kirim Ulang ke WhatsApp"
                              className="h-8 w-8 p-0"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(transaction.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              title="Hapus Transaksi"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Dialog - tetap ada untuk fungsi lain */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nota Pembayaran</DialogTitle>
            <DialogDescription>
              Nota pembayaran untuk pelanggan
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="bg-white p-6 border rounded-lg" id="receipt-content">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold">NOTA PEMBAYARAN</h2>
                  <p className="text-gray-600">LATANSA NETWORKS</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p><strong>No. Nota:</strong> {selectedTransaction.receiptNumber}</p>
                    <p><strong>Tanggal:</strong> {new Date(selectedTransaction.createdAt).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div>
                    <p><strong>No. Pelanggan:</strong> {customers.find(c => c.id === selectedTransaction.customerId)?.customerNumber}</p>
                    <p><strong>Nama:</strong> {selectedTransaction.customerName}</p>
                  </div>
                </div>
                
                <div className="border-t border-b py-4 mb-4">
                  <div className="flex justify-between">
                    <span>Pembayaran {customers.find(c => c.id === selectedTransaction.customerId)?.package}</span>
                    <span>Rp {selectedTransaction.amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Periode: {selectedTransaction.period && selectedTransaction.period.from && selectedTransaction.period.to ? 
                        `${new Date(selectedTransaction.period.from).toLocaleDateString('id-ID')} - ${new Date(selectedTransaction.period.to).toLocaleDateString('id-ID')}` :
                        'Periode tidak tersedia'
                      }
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>Rp {selectedTransaction.amount.toLocaleString('id-ID')}</span>
                </div>
                
                <div className="mt-6 text-center text-sm text-gray-600">
                  <p>Terima kasih atas pembayaran Anda</p>
                  <p>Link nota: {generateReceiptUrl(selectedTransaction.receiptNumber || '')}</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>Tutup</Button>
                <Button onClick={() => window.print()}>Print/Save PDF</Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleResendNotification(selectedTransaction)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Kirim ke WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transactions;