import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Settings, Play, CheckCircle, XCircle, Clock, AlertTriangle, User } from 'lucide-react';
import { api } from '@/utils/api';

interface TestResult {
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: string;
  data?: any;
}

const AutoSuspendTesting: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testCustomerId, setTestCustomerId] = useState('');
  const [testCustomerName, setTestCustomerName] = useState('');

  const addTestResult = (type: TestResult['type'], message: string, data?: any) => {
    const result: TestResult = {
      type,
      message,
      timestamp: new Date().toLocaleTimeString('id-ID'),
      data
    };
    setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep only last 10 results
  };

  const handleTriggerAutoSuspend = async () => {
    setIsLoading(true);
    try {
      addTestResult('info', 'Memulai proses auto suspend...');
      const response = await api.triggerAutoSuspend();
      addTestResult('success', `Auto suspend berhasil dijalankan: ${response.message || 'Selesai'}`);
    } catch (error: any) {
      addTestResult('error', `Gagal menjalankan auto suspend: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspendOverdue = async () => {
    setIsLoading(true);
    try {
      addTestResult('info', 'Memulai suspend pelanggan terlambat...');
      const response = await api.suspendOverdueCustomers();
      addTestResult('success', `Suspend overdue berhasil: ${response.message || 'Selesai'}`);
    } catch (error: any) {
      addTestResult('error', `Gagal suspend overdue: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSuspendCustomer = async () => {
    if (!testCustomerId.trim()) {
      addTestResult('error', 'Silakan masukkan Customer ID');
      return;
    }

    setIsLoading(true);
    try {
      addTestResult('info', `Memulai suspend customer ${testCustomerId}...`);
      const response = await api.testSuspendCustomer(testCustomerId.trim());
      addTestResult('success', `Suspend customer berhasil: ${response.message || 'Selesai'}`, response.data);
    } catch (error: any) {
      addTestResult('error', `Gagal suspend customer: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEnableCustomer = async () => {
     if (!testCustomerId.trim()) {
       addTestResult('error', 'Silakan masukkan Customer ID');
       return;
     }
 
     setIsLoading(true);
     try {
       addTestResult('info', `Memulai enable customer ${testCustomerId}...`);
       const response = await api.testEnableCustomer(testCustomerId.trim());
       addTestResult('success', `Enable customer berhasil: ${response.message || 'Selesai'}`, response.data);
     } catch (error: any) {
       addTestResult('error', `Gagal enable customer: ${error.message || 'Unknown error'}`);
     } finally {
       setIsLoading(false);
     }
   };

   const handleTestSuspendCustomerByName = async () => {
     if (!testCustomerName.trim()) {
       addTestResult('error', 'Silakan masukkan nama customer');
       return;
     }
 
     setIsLoading(true);
     try {
       addTestResult('info', `Mencari dan suspend customer: ${testCustomerName}...`);
       const response = await api.testSuspendCustomerByName(testCustomerName.trim());
       addTestResult('success', `${response.message || 'Suspend berhasil'}`, response.data);
     } catch (error: any) {
       const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
       addTestResult('error', `Gagal suspend customer: ${errorMsg}`);
     } finally {
       setIsLoading(false);
     }
   };

   const handleTestEnableCustomerByName = async () => {
     if (!testCustomerName.trim()) {
       addTestResult('error', 'Silakan masukkan nama customer');
       return;
     }
 
     setIsLoading(true);
     try {
       addTestResult('info', `Mencari dan enable customer: ${testCustomerName}...`);
       const response = await api.testEnableCustomerByName(testCustomerName.trim());
       addTestResult('success', `${response.message || 'Enable berhasil'}`, response.data);
     } catch (error: any) {
       const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
       addTestResult('error', `Gagal enable customer: ${errorMsg}`);
     } finally {
       setIsLoading(false);
     }
   };

  const getResultIcon = (type: TestResult['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'info':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getResultBadgeVariant = (type: TestResult['type']) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'info':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Testing Auto Suspend System</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Control Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={handleTriggerAutoSuspend}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <Play className="h-4 w-4" />
            <span>Trigger Auto Suspend</span>
          </Button>
          
          <Button 
            onClick={handleSuspendOverdue}
            disabled={isLoading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Suspend Overdue</span>
          </Button>
        </div>

        {/* Individual Customer Testing */}
         <div className="space-y-3">
           <h4 className="font-semibold text-sm">Test Individual Customer:</h4>
           
           {/* Test by Customer ID */}
           <div className="space-y-2">
             <label className="text-xs text-gray-600">By Customer ID:</label>
             <div className="flex space-x-2">
               <Input
                 placeholder="Enter Customer ID"
                 value={testCustomerId}
                 onChange={(e) => setTestCustomerId(e.target.value)}
                 className="flex-1"
               />
               <Button 
                 onClick={handleTestSuspendCustomer}
                 disabled={isLoading || !testCustomerId.trim()}
                 variant="destructive"
                 className="flex items-center space-x-2"
               >
                 <XCircle className="h-4 w-4" />
                 <span>Suspend</span>
               </Button>
               <Button 
                 onClick={handleTestEnableCustomer}
                 disabled={isLoading || !testCustomerId.trim()}
                 variant="default"
                 className="flex items-center space-x-2"
               >
                 <CheckCircle className="h-4 w-4" />
                 <span>Enable</span>
               </Button>
             </div>
           </div>
           
           {/* Test by Customer Name */}
           <div className="space-y-2">
             <label className="text-xs text-gray-600">By Customer Name:</label>
             <div className="flex space-x-2">
               <Input
                 placeholder="Masukkan nama customer (sebagian nama juga bisa)"
                 value={testCustomerName}
                 onChange={(e) => setTestCustomerName(e.target.value)}
                 className="flex-1"
               />
               <Button 
                 onClick={handleTestSuspendCustomerByName}
                 disabled={isLoading || !testCustomerName.trim()}
                 variant="destructive"
                 className="flex items-center space-x-2"
               >
                 <XCircle className="h-4 w-4" />
                 <span>Suspend</span>
               </Button>
               <Button 
                 onClick={handleTestEnableCustomerByName}
                 disabled={isLoading || !testCustomerName.trim()}
                 variant="default"
                 className="flex items-center space-x-2"
               >
                 <CheckCircle className="h-4 w-4" />
                 <span>Enable</span>
               </Button>
             </div>
           </div>
         </div>

        {/* Information Alert */}
         <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Info:</strong> Auto suspend berjalan otomatis setiap tanggal 6 setiap bulan pukul 00:01. 
              Gunakan tombol di atas untuk testing manual atau test individual customer berdasarkan ID atau nama. 
              Pencarian nama menggunakan partial match (sebagian nama juga bisa). Pastikan server backend sudah running.
            </AlertDescription>
          </Alert>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Hasil Testing:</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start space-x-2 p-2 bg-gray-50 rounded-md">
                  {getResultIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getResultBadgeVariant(result.type)} className="text-xs">
                        {result.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>
                    <p className="text-sm mt-1 break-words">{result.message}</p>
                    
                    {/* Show detailed data for customer testing */}
                    {result.data && result.data.customer && (
                      <div className="mt-2 p-2 bg-white rounded border">
                        <p className="text-xs font-medium mb-1">Customer Details:</p>
                        <div className="text-xs space-y-1">
                          <p><strong>ID:</strong> {result.data.customer.id}</p>
                          <p><strong>Name:</strong> {result.data.customer.name}</p>
                          <p><strong>PPP Secret:</strong> {result.data.customer.pppSecret}</p>
                          <p><strong>Router:</strong> {result.data.customer.router}</p>
                          <p><strong>Status:</strong> 
                            <Badge 
                              variant={result.data.customer.mikrotikStatus === 'enabled' ? 'default' : 'destructive'}
                              className="ml-1 text-xs"
                            >
                              {result.data.customer.mikrotikStatus}
                            </Badge>
                          </p>
                          {result.data.mikrotikResult && (
                            <p><strong>Mikrotik Result:</strong> 
                              <Badge 
                                variant={result.data.mikrotikResult.success ? 'default' : 'destructive'}
                                className="ml-1 text-xs"
                              >
                                {result.data.mikrotikResult.success ? 'Success' : 'Failed'}
                              </Badge>
                              {result.data.mikrotikResult.error && (
                                <span className="block text-red-600 mt-1">
                                  Error: {result.data.mikrotikResult.error}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-gray-600">Memproses...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AutoSuspendTesting;