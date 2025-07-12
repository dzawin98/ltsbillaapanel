import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Send, Users, MessageSquare, Clock, Settings, FileText, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useCustomers } from '@/hooks/useCustomers';
import { useAreas } from '@/hooks/useAreas';
import { usePackages } from '@/hooks/usePackages';
import { useODP } from '@/hooks/useODP';
import { Customer } from '@/types/isp';
import { toast } from 'sonner';

interface MessageHistory {
  id: string;
  recipients: number;
  message: string;
  criteria: string;
  sentAt: Date;
  status: 'sent' | 'failed' | 'pending';
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  category: 'maintenance' | 'payment' | 'promotion' | 'general';
}

interface BroadcastCriteria {
  area: string;
  billingType: string;
  package: string;
  odp: string;
  paymentStatus: string;
  dateExpiryCriteria: string;
  dateSuspendCriteria: string;
  sendToCustomer: string;
  message: string;
}

const Messages = () => {
  const { customers } = useCustomers();
  const { areas } = useAreas();
  const { packages } = usePackages();
  const { odp: odps } = useODP();
  
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showAddTemplateDialog, setShowAddTemplateDialog] = useState(false);
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
    category: 'general' as MessageTemplate['category']
  });
  
  const [wahaConfig, setWahaConfig] = useState({
    baseUrl: 'http://localhost:3000',
    session: 'default',
    apiKey: ''
  });
  
  // Load WAHA config and templates from localStorage on component mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('wahaConfig');
    if (savedConfig) {
      try {
        setWahaConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Error loading WAHA config:', error);
      }
    }
    
    const savedTemplates = localStorage.getItem('messageTemplates');
    if (savedTemplates) {
      try {
        const templates = JSON.parse(savedTemplates);
        setMessageTemplates(templates.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt)
        })));
      } catch (error) {
        console.error('Error loading message templates:', error);
      }
    } else {
      // Set default templates
      const defaultTemplates: MessageTemplate[] = [
        {
          id: '1',
          name: 'Pemeliharaan Jaringan',
          category: 'maintenance',
          content: `Pemberitahuan Pemeliharaan Jaringan\n\nKepada Pelanggan Yth,\n\nKami ingin memberitahukan bahwa saat ini kami sedang melakukan pemeliharaan jaringan di area [AREA], dikarenakan adanya gangguan pada kabel Fiber yang putus.\n\nNama: [NAMA]\nNo. Pelanggan: [NOPEL]\nPaket: [PAKET]\n\nMohon pengertian Anda atas ketidaknyamanan yang terjadi.`,
          createdAt: new Date()
        },
        {
          id: '2',
          name: 'Reminder Pembayaran',
          category: 'payment',
          content: `Reminder Pembayaran Tagihan\n\nYth. [NAMA],\n\nTagihan internet Anda untuk bulan ini akan jatuh tempo. Mohon segera lakukan pembayaran.\n\nNo. Pelanggan: [NOPEL]\nPaket: [PAKET]\nArea: [AREA]\n\nTerima kasih atas perhatiannya.`,
          createdAt: new Date()
        }
      ];
      setMessageTemplates(defaultTemplates);
      localStorage.setItem('messageTemplates', JSON.stringify(defaultTemplates));
    }
  }, []);
  
  const [broadcastData, setBroadcastData] = useState<BroadcastCriteria>({
    area: '',
    billingType: '',
    package: '',
    odp: '',
    paymentStatus: '',
    dateExpiryCriteria: '',
    dateSuspendCriteria: '',
    sendToCustomer: '',
    message: `Pemberitahuan Pemeliharaan Jaringan\n\nKepada Pelanggan Yth,\n\nKami ingin memberitahukan bahwa saat ini kami sedang melakukan pemeliharaan jaringan di area [AREA], dikarenakan adanya gangguan pada kabel Fiber yang putus.\n\nNama: [NAMA]\nNo. Pelanggan: [NOPEL]\nPaket: [PAKET]\n\nMohon pengertian Anda atas ketidaknyamanan yang terjadi.`
  });

  // Template management functions
  const saveTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.content.trim()) {
      toast.error('Nama dan isi template harus diisi');
      return;
    }

    const template: MessageTemplate = {
      id: editingTemplate ? editingTemplate.id : Date.now().toString(),
      name: newTemplate.name.trim(),
      content: newTemplate.content.trim(),
      category: newTemplate.category,
      createdAt: editingTemplate ? editingTemplate.createdAt : new Date()
    };

    let updatedTemplates;
    if (editingTemplate) {
      updatedTemplates = messageTemplates.map(t => t.id === editingTemplate.id ? template : t);
      toast.success('Template berhasil diperbarui');
    } else {
      updatedTemplates = [...messageTemplates, template];
      toast.success('Template berhasil ditambahkan');
    }

    setMessageTemplates(updatedTemplates);
    localStorage.setItem('messageTemplates', JSON.stringify(updatedTemplates));
    
    // Reset form
    setNewTemplate({ name: '', content: '', category: 'general' });
    setEditingTemplate(null);
    setShowAddTemplateDialog(false);
  };

  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = messageTemplates.filter(t => t.id !== templateId);
    setMessageTemplates(updatedTemplates);
    localStorage.setItem('messageTemplates', JSON.stringify(updatedTemplates));
    toast.success('Template berhasil dihapus');
  };

  const editTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      content: template.content,
      category: template.category
    });
    setShowAddTemplateDialog(true);
  };

  const useTemplate = (template: MessageTemplate) => {
    setBroadcastData(prev => ({
      ...prev,
      message: template.content
    }));
    setShowTemplateDialog(false);
    toast.success(`Template "${template.name}" berhasil dimuat`);
  };

  const getCategoryBadgeColor = (category: MessageTemplate['category']) => {
    switch (category) {
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      case 'payment': return 'bg-blue-100 text-blue-800';
      case 'promotion': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: MessageTemplate['category']) => {
    switch (category) {
      case 'maintenance': return 'Pemeliharaan';
      case 'payment': return 'Pembayaran';
      case 'promotion': return 'Promosi';
      default: return 'Umum';
    }
  };

  // Filter customers based on criteria
  const getFilteredCustomers = (): Customer[] => {
    if (!customers) return [];
    
    console.log('Starting filter with criteria:', broadcastData);
    console.log('Total customers:', customers.length);
    
    return customers.filter((customer) => {
      // PERBAIKAN: Jika ada filter pelanggan tertentu, prioritaskan dan abaikan filter lainnya
      if (broadcastData.sendToCustomer && broadcastData.sendToCustomer.trim() !== '') {
        const searchTerm = broadcastData.sendToCustomer.toLowerCase().trim();
        
        // Jika input adalah nomor (hanya angka), prioritaskan pencarian nomor
        const isNumericSearch = /^\d+$/.test(searchTerm);
        
        let matches = false;
        
        if (isNumericSearch) {
          // Pencarian berdasarkan nomor (nomor pelanggan atau HP)
          matches = customer.customerNumber.toLowerCase().includes(searchTerm) ||
                   customer.phone.replace(/[^0-9]/g, '').includes(searchTerm);
        } else {
          // Pencarian berdasarkan nama atau kombinasi
          matches = customer.name.toLowerCase().includes(searchTerm) ||
                   customer.customerNumber.toLowerCase().includes(searchTerm) ||
                   customer.phone.replace(/[^0-9]/g, '').includes(searchTerm.replace(/[^0-9]/g, '')) ||
                   (customer.address && customer.address.toLowerCase().includes(searchTerm));
        }
        
        if (matches) {
          console.log('Customer matched search term:', customer.name);
          return true;
        } else {
          console.log('Filtered out by search term:', customer.name, 'Search:', searchTerm);
          return false;
        }
      }
      
      // Area filter
      if (broadcastData.area && broadcastData.area !== 'all') {
        if (customer.area !== broadcastData.area) {
          console.log('Filtered out by area:', customer.name, 'Expected:', broadcastData.area, 'Actual:', customer.area);
          return false;
        }
      }
      
      // Billing type filter
      if (broadcastData.billingType && broadcastData.billingType !== 'all') {
        if (customer.billingType !== broadcastData.billingType) {
          console.log('Filtered out by billing type:', customer.name, 'Expected:', broadcastData.billingType, 'Actual:', customer.billingType);
          return false;
        }
      }
      
      // Package filter
      if (broadcastData.package && broadcastData.package !== 'all') {
        if (customer.package !== broadcastData.package) {
          console.log('Filtered out by package:', customer.name, 'Expected:', broadcastData.package, 'Actual:', customer.package);
          return false;
        }
      }
      
      // ODP filter - perbaiki untuk menggunakan odpData.name
      if (broadcastData.odp && broadcastData.odp !== 'all') {
        const customerOdpName = customer.odpData?.name || customer.odpSlot || '';
        if (!customerOdpName.includes(broadcastData.odp)) {
          console.log('Filtered out by ODP:', customer.name, 'Expected:', broadcastData.odp, 'Actual:', customerOdpName);
          return false;
        }
      }
      
      // Payment status filter - perbaiki logika
      if (broadcastData.paymentStatus && broadcastData.paymentStatus !== 'all') {
        // Gunakan billingStatus jika tersedia
        if (customer.billingStatus) {
          const isPaid = customer.billingStatus === 'lunas';
          if (broadcastData.paymentStatus === 'paid' && !isPaid) {
            console.log('Filtered out by payment status (billing):', customer.name, 'Expected: paid, Actual:', customer.billingStatus);
            return false;
          }
          if (broadcastData.paymentStatus === 'unpaid' && isPaid) {
            console.log('Filtered out by payment status (billing):', customer.name, 'Expected: unpaid, Actual:', customer.billingStatus);
            return false;
          }
        } else {
          // Fallback ke logika tanggal jatuh tempo
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const expireDate = customer.expireDate ? new Date(customer.expireDate) : null;
          if (expireDate) {
            expireDate.setHours(0, 0, 0, 0);
          }
          const isOverdue = expireDate ? expireDate.getTime() < today.getTime() : false;
          
          if (broadcastData.paymentStatus === 'paid' && isOverdue) {
            console.log('Filtered out by payment status (date):', customer.name, 'Overdue');
            return false;
          }
          if (broadcastData.paymentStatus === 'unpaid' && !isOverdue) {
            console.log('Filtered out by payment status (date):', customer.name, 'Not overdue');
            return false;
          }
        }
      }
      
      // Date expiry criteria - perbaiki logika tanggal
      if (broadcastData.dateExpiryCriteria && broadcastData.dateExpiryCriteria !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (!customer.expireDate) {
          console.log('Filtered out by expiry date (no date):', customer.name);
          return false;
        }
        
        const expireDate = new Date(customer.expireDate);
        expireDate.setHours(0, 0, 0, 0);
        
        if (broadcastData.dateExpiryCriteria === 'today') {
          if (expireDate.getTime() !== today.getTime()) {
            console.log('Filtered out by expiry date (not today):', customer.name);
            return false;
          }
        } else if (broadcastData.dateExpiryCriteria === 'tomorrow') {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (expireDate.getTime() !== tomorrow.getTime()) {
            console.log('Filtered out by expiry date (not tomorrow):', customer.name);
            return false;
          }
        } else {
          // Handle specific day criteria (1_day, 2_days, etc.)
          const daysMap: { [key: string]: number } = {
            '1_day': 1, '2_days': 2, '3_days': 3, '4_days': 4,
            '5_days': 5, '6_days': 6, '7_days': 7
          };
          
          if (daysMap[broadcastData.dateExpiryCriteria]) {
            const targetDate = new Date(today);
            targetDate.setDate(targetDate.getDate() + daysMap[broadcastData.dateExpiryCriteria]);
            if (expireDate.getTime() !== targetDate.getTime()) {
              console.log('Filtered out by expiry date (not target day):', customer.name);
              return false;
            }
          }
        }
      }
      
      // PERBAIKAN: Suspend criteria - logika yang benar dan opsi yang lebih lengkap
      if (broadcastData.dateSuspendCriteria && broadcastData.dateSuspendCriteria !== 'all') {
        if (broadcastData.dateSuspendCriteria === 'isolated') {
          // Filter pelanggan yang sedang diisolir
          if (!customer.isIsolated) {
            console.log('Filtered out by suspend criteria (not isolated):', customer.name);
            return false;
          }
        } else if (broadcastData.dateSuspendCriteria === 'not_isolated') {
          // Filter pelanggan yang tidak diisolir
          if (customer.isIsolated) {
            console.log('Filtered out by suspend criteria (is isolated):', customer.name);
            return false;
          }
        } else if (broadcastData.dateSuspendCriteria === 'suspended') {
          // Filter pelanggan dengan status suspended
          if (customer.status !== 'suspended') {
            console.log('Filtered out by suspend criteria (not suspended):', customer.name, 'Status:', customer.status);
            return false;
          }
        } else if (broadcastData.dateSuspendCriteria === 'active') {
          // Filter pelanggan dengan status active
          if (customer.status !== 'active') {
            console.log('Filtered out by suspend criteria (not active):', customer.name, 'Status:', customer.status);
            return false;
          }
        } else if (broadcastData.dateSuspendCriteria === 'today') {
          // Filter pelanggan yang diisolir hari ini (memerlukan data lastSuspendDate)
          if (!customer.isIsolated) {
            console.log('Filtered out by suspend criteria (not isolated today):', customer.name);
            return false;
          }
          // Bisa ditambahkan logika untuk cek tanggal isolir jika ada field lastSuspendDate
        }
      }
      
      console.log('Customer passed all filters:', customer.name);
      return true;
    });
  };

  // Replace message placeholders
  const replaceMessagePlaceholders = (message: string, customer: Customer): string => {
    return message
      .replace(/\[NOPEL\]/g, customer.customerNumber)
      .replace(/\[NAMA\]/g, customer.name)
      .replace(/\[PAKET\]/g, customer.package)
      .replace(/\[AREA\]/g, customer.area)
      .replace(/\[PHONE\]/g, customer.phone)
      .replace(/\[ADDRESS\]/g, customer.address || '');
  };

  // Send message via WAHA API
  const sendWhatsAppMessage = async (phone: string, message: string): Promise<boolean> => {
    try {
      // Format phone number (remove +, spaces, etc.)
      const formattedPhone = phone.replace(/[^0-9]/g, '');
      const chatId = formattedPhone.startsWith('62') ? 
        `${formattedPhone}@c.us` : 
        `62${formattedPhone.startsWith('0') ? formattedPhone.substring(1) : formattedPhone}@c.us`;
      
      // Cek apakah session tersedia terlebih dahulu
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
      
      // PERBAIKAN: Coba beberapa endpoint yang berbeda
      const endpoints = [
        // Endpoint v1 (paling umum)
        `${wahaConfig.baseUrl}/api/sendText`,
        // Endpoint v2
        `${wahaConfig.baseUrl}/api/${wahaConfig.session}/sendText`,
        // Endpoint v3 (swagger style)
        `${wahaConfig.baseUrl}/api/sessions/${wahaConfig.session}/chats/${chatId}/messages`,
        // Endpoint v4 (alternative)
        `${wahaConfig.baseUrl}/api/v1/sessions/${wahaConfig.session}/chats/${chatId}/messages/text`
      ];
      
      const payloads = [
        // Payload v1
        {
          session: wahaConfig.session,
          chatId: chatId,
          text: message
        },
        // Payload v2
        {
          chatId: chatId,
          text: message
        },
        // Payload v3
        {
          text: message
        },
        // Payload v4
        {
          text: message
        }
      ];
      
      // Coba setiap endpoint sampai ada yang berhasil
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
            console.log(`Berhasil dengan endpoint ${i + 1}:`, result);
            return result.id || result.messageId || result.success ? true : false;
          } else {
            console.log(`Endpoint ${i + 1} gagal:`, response.status, response.statusText);
          }
        } catch (endpointError) {
          console.log(`Error pada endpoint ${i + 1}:`, endpointError);
        }
      }
      
      throw new Error('Semua endpoint gagal. Periksa dokumentasi WAHA API Anda.');
      
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  };

  // Fungsi untuk test koneksi WAHA
  const testWahaConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    
    try {
      // Test koneksi ke WAHA
      const response = await fetch(`${wahaConfig.baseUrl}/api/sessions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(wahaConfig.apiKey && { 'X-Api-Key': wahaConfig.apiKey })
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const sessions = await response.json();
      const targetSession = sessions.find((s: any) => s.name === wahaConfig.session);
      
      if (!targetSession) {
        throw new Error(`Session '${wahaConfig.session}' tidak ditemukan`);
      }
      
      if (targetSession.status !== 'WORKING') {
        throw new Error(`Session '${wahaConfig.session}' status: ${targetSession.status}. Harus WORKING`);
      }
      
      setConnectionStatus('success');
      toast.success('Koneksi WAHA berhasil!');
    } catch (error) {
      console.error('Test connection error:', error);
      setConnectionStatus('error');
      toast.error(`Koneksi gagal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleInputChange = (field: keyof BroadcastCriteria, value: string) => {
    setBroadcastData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!broadcastData.message.trim()) {
      toast.error('Pesan tidak boleh kosong');
      return;
    }
    
    const targetCustomers = getFilteredCustomers();
    
    if (targetCustomers.length === 0) {
      toast.error('Tidak ada pelanggan yang sesuai dengan kriteria');
      return;
    }
    
    setIsLoading(true);
    
    try {
      let successCount = 0;
      let failedCount = 0;
      const failedCustomers: string[] = [];
      
      for (const customer of targetCustomers) {
        try {
          const personalizedMessage = replaceMessagePlaceholders(broadcastData.message, customer);
          const success = await sendWhatsAppMessage(customer.phone, personalizedMessage);
          
          if (success) {
            successCount++;
          } else {
            failedCount++;
            failedCustomers.push(customer.name);
          }
          
          // Delay antar pengiriman untuk menghindari rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error sending to ${customer.name}:`, error);
          failedCount++;
          failedCustomers.push(customer.name);
        }
      }
      
      // Simpan ke history
      const newHistory: MessageHistory = {
        id: Date.now().toString(),
        recipients: targetCustomers.length,
        message: broadcastData.message,
        criteria: Object.entries(broadcastData)
          .filter(([key, value]) => key !== 'message' && value && value !== 'all' && value.trim() !== '')
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ') || 'Semua pelanggan',
        sentAt: new Date(),
        status: failedCount === 0 ? 'sent' : failedCount === targetCustomers.length ? 'failed' : 'sent'
      };
      
      setMessageHistory(prev => [newHistory, ...prev]);
      
      // Reset form
      setBroadcastData(prev => ({
        ...prev,
        area: '',
        billingType: '',
        package: '',
        odp: '',
        paymentStatus: '',
        dateExpiryCriteria: '',
        dateSuspendCriteria: '',
        sendToCustomer: ''
      }));
      
      setShowBroadcastForm(false);
      
      if (successCount > 0) {
        toast.success(`Berhasil mengirim ${successCount} pesan${failedCount > 0 ? `, ${failedCount} gagal` : ''}`);
      }
      
      if (failedCount > 0) {
        toast.error(`${failedCount} pesan gagal dikirim: ${failedCustomers.slice(0, 3).join(', ')}${failedCustomers.length > 3 ? '...' : ''}`);
      }
      
    } catch (error) {
      console.error('Error in broadcast:', error);
      toast.error('Terjadi kesalahan saat mengirim pesan');
    } finally {
      setIsLoading(false);
    }
  };

  const saveWahaConfig = () => {
    localStorage.setItem('wahaConfig', JSON.stringify(wahaConfig));
    toast.success('Konfigurasi WAHA berhasil disimpan');
    setShowSettingsDialog(false);
  };

  const filteredCustomers = getFilteredCustomers();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pesan WhatsApp</h1>
          <p className="text-gray-600">Kirim pesan broadcast ke pelanggan melalui WhatsApp</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Pengaturan WAHA
              </Button>
            </DialogTrigger>
          </Dialog>
          <Button onClick={() => setShowBroadcastForm(true)} className="bg-green-600 hover:bg-green-700">
            <Send className="h-4 w-4 mr-2" />
            Kirim Pesan
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Pelanggan</p>
                <p className="text-2xl font-bold text-gray-900">{customers?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pesan Terkirim</p>
                <p className="text-2xl font-bold text-gray-900">
                  {messageHistory.filter(h => h.status === 'sent').reduce((sum, h) => sum + h.recipients, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Template Tersimpan</p>
                <p className="text-2xl font-bold text-gray-900">{messageTemplates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pesan</CardTitle>
        </CardHeader>
        <CardContent>
          {messageHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada riwayat pesan</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Kriteria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pesan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messageHistory.map((history) => (
                  <TableRow key={history.id}>
                    <TableCell>{history.sentAt.toLocaleString('id-ID')}</TableCell>
                    <TableCell>{history.recipients} pelanggan</TableCell>
                    <TableCell className="max-w-xs truncate">{history.criteria}</TableCell>
                    <TableCell>
                      <Badge variant={history.status === 'sent' ? 'default' : 'destructive'}>
                        {history.status === 'sent' ? 'Terkirim' : 'Gagal'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{history.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* WAHA Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pengaturan WAHA API</DialogTitle>
            <DialogDescription>
              Konfigurasi koneksi ke WAHA (WhatsApp HTTP API)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="baseUrl">Base URL WAHA</Label>
              <Input
                id="baseUrl"
                value={wahaConfig.baseUrl}
                onChange={(e) => setWahaConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="http://localhost:3000"
              />
            </div>
            
            <div>
              <Label htmlFor="session">Nama Session</Label>
              <Input
                id="session"
                value={wahaConfig.session}
                onChange={(e) => setWahaConfig(prev => ({ ...prev, session: e.target.value }))}
                placeholder="default"
              />
            </div>
            
            <div>
              <Label htmlFor="apiKey">API Key (Opsional)</Label>
              <Input
                id="apiKey"
                type="password"
                value={wahaConfig.apiKey}
                onChange={(e) => setWahaConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Masukkan API key jika diperlukan"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={testWahaConnection}
                disabled={isTestingConnection}
                className="flex-1"
              >
                {isTestingConnection ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Koneksi'
                )}
              </Button>
              
              {connectionStatus !== 'idle' && (
                <div className={`px-3 py-2 rounded text-sm ${
                  connectionStatus === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {connectionStatus === 'success' ? '✓ Berhasil' : '✗ Gagal'}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                Batal
              </Button>
              <Button onClick={saveWahaConfig}>
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Broadcast Form Dialog */}
      <Dialog open={showBroadcastForm} onOpenChange={setShowBroadcastForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kirim Pesan Broadcast WhatsApp</DialogTitle>
            <DialogDescription>
              Pilih kriteria pelanggan dan tulis pesan yang akan dikirim melalui WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSendMessage} className="space-y-4">
            {/* Criteria Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="area">AREA / WILAYAH</Label>
                <Select value={broadcastData.area} onValueChange={(value) => handleInputChange('area', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Area</SelectItem>
                    {areas?.map((area) => (
                      <SelectItem key={area.id} value={area.name}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="billingType">TIPE PENAGIHAN</Label>
                <Select value={broadcastData.billingType} onValueChange={(value) => handleInputChange('billingType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tipe</SelectItem>
                    <SelectItem value="prepaid">Prabayar</SelectItem>
                    <SelectItem value="postpaid">Pascabayar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="package">PAKET</Label>
                <Select value={broadcastData.package} onValueChange={(value) => handleInputChange('package', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Paket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Paket</SelectItem>
                    {packages?.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.name}>
                        {pkg.name} - {pkg.speed}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="odp">ODP</Label>
                <Select value={broadcastData.odp} onValueChange={(value) => handleInputChange('odp', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih ODP" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua ODP</SelectItem>
                    {odps?.map((odp) => (
                      <SelectItem key={odp.id} value={odp.name}>
                        {odp.name} - {odp.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="paymentStatus">STATUS PEMBAYARAN</Label>
                <Select value={broadcastData.paymentStatus} onValueChange={(value) => handleInputChange('paymentStatus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="paid">Sudah Bayar</SelectItem>
                    <SelectItem value="unpaid">Belum Bayar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="dateExpiryCriteria">KRITERIA TANGGAL JATUH TEMPO</Label>
                <Select value={broadcastData.dateExpiryCriteria} onValueChange={(value) => handleInputChange('dateExpiryCriteria', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kriteria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="today">Hari Ini</SelectItem>
                    <SelectItem value="tomorrow">Besok</SelectItem>
                    <SelectItem value="1_day">1 Hari Lagi</SelectItem>
                    <SelectItem value="2_days">2 Hari Lagi</SelectItem>
                    <SelectItem value="3_days">3 Hari Lagi</SelectItem>
                    <SelectItem value="7_days">7 Hari Lagi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="dateSuspendCriteria">KRITERIA ISOLIR/SUSPEND</Label>
                <Select value={broadcastData.dateSuspendCriteria} onValueChange={(value) => handleInputChange('dateSuspendCriteria', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kriteria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="isolated">Sedang Diisolir</SelectItem>
                    <SelectItem value="not_isolated">Tidak Diisolir</SelectItem>
                    <SelectItem value="suspended">Status Suspended</SelectItem>
                    <SelectItem value="active">Status Active</SelectItem>
                    <SelectItem value="today">Diisolir Hari Ini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Send to specific customer */}
            <div>
              <Label htmlFor="sendToCustomer">KIRIM KE PELANGGAN TERTENTU</Label>
              <Input
                id="sendToCustomer"
                value={broadcastData.sendToCustomer}
                onChange={(e) => handleInputChange('sendToCustomer', e.target.value)}
                placeholder="Masukkan nama, nomor pelanggan, atau nomor HP"
              />
            </div>
            
            {/* Message with Template Management */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="message">PESAN</Label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplateDialog(true)}
                    className="text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Pilih Template
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTemplate(null);
                      setNewTemplate({ name: '', content: '', category: 'general' });
                      setShowAddTemplateDialog(true);
                    }}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Buat Template
                  </Button>
                </div>
              </div>
              <Textarea
                id="message"
                value={broadcastData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Tulis pesan Anda di sini...\n\nGunakan placeholder:\n[NAMA] - Nama pelanggan\n[NOPEL] - Nomor pelanggan\n[PAKET] - Paket internet\n[AREA] - Area pelanggan\n[PHONE] - Nomor HP\n[ADDRESS] - Alamat"
                rows={8}
                className="resize-none"
              />
            </div>
            
            {/* Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Preview Penerima:</h4>
              <p className="text-sm text-gray-600">
                {filteredCustomers.length} pelanggan akan menerima pesan ini
              </p>
              
              {/* Debug Info */}
              <div className="mt-2 text-xs text-gray-500">
                <p>Total pelanggan: {customers?.length || 0}</p>
                <p>Kriteria aktif: {Object.entries(broadcastData).filter(([key, value]) => 
                  key !== 'message' && value && value !== 'all' && value.trim() !== ''
                ).map(([key, value]) => `${key}: ${value}`).join(', ') || 'Tidak ada'}</p>
                
                {/* Informasi khusus untuk filter pelanggan tertentu */}
                {broadcastData.sendToCustomer && broadcastData.sendToCustomer.trim() !== '' && (
                  <p className="text-blue-600 font-medium">
                    🔍 Mode pencarian pelanggan tertentu: "{broadcastData.sendToCustomer}"
                    <br />
                    <span className="text-xs text-gray-500">
                      (Filter lain diabaikan saat mencari pelanggan tertentu)
                    </span>
                  </p>
                )}
              </div>
              
              {filteredCustomers.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto">
                  <div className="text-xs text-gray-500 space-y-1">
                    {filteredCustomers.slice(0, 5).map((customer) => (
                      <div key={customer.id} className="flex justify-between">
                        <span>{customer.name} ({customer.customerNumber})</span>
                        <span className="text-gray-400">
                          {customer.isIsolated ? '🔒' : '✅'} 
                          {customer.status === 'suspended' ? ' 🚫' : ''}
                        </span>
                      </div>
                    ))}
                    {filteredCustomers.length > 5 && (
                      <div className="text-gray-400">... dan {filteredCustomers.length - 5} lainnya</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowBroadcastForm(false)}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700"
                disabled={isLoading || filteredCustomers.length === 0}
              >
                {isLoading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Kirim Pesan ({filteredCustomers.length})
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pilih Template Pesan</DialogTitle>
            <DialogDescription>
              Pilih template pesan yang sudah tersimpan atau kelola template Anda
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Template List */}
            {messageTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada template pesan</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingTemplate(null);
                    setNewTemplate({ name: '', content: '', category: 'general' });
                    setShowAddTemplateDialog(true);
                  }}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Template Pertama
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {messageTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{template.name}</h3>
                            <Badge className={getCategoryBadgeColor(template.category)}>
                              {getCategoryLabel(template.category)}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            Dibuat: {template.createdAt.toLocaleDateString('id-ID')}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editTemplate(template)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTemplate(template.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3 max-h-20 overflow-y-auto">
                        {template.content}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => useTemplate(template)}
                        className="w-full"
                      >
                        Gunakan Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingTemplate(null);
                  setNewTemplate({ name: '', content: '', category: 'general' });
                  setShowAddTemplateDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Template
              </Button>
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Template Dialog */}
      <Dialog open={showAddTemplateDialog} onOpenChange={setShowAddTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Tambah Template Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Ubah template pesan yang sudah ada' : 'Buat template pesan baru untuk digunakan nanti'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="templateName">Nama Template</Label>
              <Input
                id="templateName"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Masukkan nama template"
              />
            </div>
            
            <div>
              <Label htmlFor="templateCategory">Kategori</Label>
              <Select 
                value={newTemplate.category} 
                onValueChange={(value: MessageTemplate['category']) => 
                  setNewTemplate(prev => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Umum</SelectItem>
                  <SelectItem value="maintenance">Pemeliharaan</SelectItem>
                  <SelectItem value="payment">Pembayaran</SelectItem>
                  <SelectItem value="promotion">Promosi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="templateContent">Isi Template</Label>
              <Textarea
                id="templateContent"
                value={newTemplate.content}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Tulis isi template di sini...\n\nGunakan placeholder:\n[NAMA] - Nama pelanggan\n[NOPEL] - Nomor pelanggan\n[PAKET] - Paket internet\n[AREA] - Area pelanggan\n[PHONE] - Nomor HP\n[ADDRESS] - Alamat"
                rows={8}
                className="resize-none"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddTemplateDialog(false);
                  setEditingTemplate(null);
                  setNewTemplate({ name: '', content: '', category: 'general' });
                }}
              >
                Batal
              </Button>
              <Button onClick={saveTemplate}>
                {editingTemplate ? 'Perbarui' : 'Simpan'} Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Messages;