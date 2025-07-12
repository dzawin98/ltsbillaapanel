import React, { useState } from 'react';
import { Button } from './ui/button';
import { Loader2, Power, PowerOff, RefreshCw } from 'lucide-react';
import { disablePPPUser, enablePPPUser, checkPPPUserStatus } from '../utils/api';
import { toast } from 'sonner';

interface PPPUserControlProps {
  customerId: string;
  onStatusChange?: () => void;
}

const PPPUserControl: React.FC<PPPUserControlProps> = ({ customerId, onStatusChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'active' | 'disabled' | 'unknown'>('unknown');

  const handleDisablePPP = async () => {
    if (!customerId) return;
    
    setIsLoading(true);
    try {
      const response = await disablePPPUser(customerId);
      
      if (response.success) {
        setCurrentStatus('disabled');
        toast.success(response.message || 'PPP user berhasil dinonaktifkan');
        onStatusChange?.();
      } else {
        toast.error(response.message || 'Gagal menonaktifkan PPP user');
      }
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan saat menonaktifkan PPP user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnablePPP = async () => {
    if (!customerId) return;
    
    setIsLoading(true);
    try {
      const response = await enablePPPUser(customerId);
      
      if (response.success) {
        setCurrentStatus('active');
        toast.success(response.message || 'PPP user berhasil diaktifkan');
        onStatusChange?.();
      } else {
        toast.error(response.message || 'Gagal mengaktifkan PPP user');
      }
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan saat mengaktifkan PPP user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!customerId) return;
    
    setIsChecking(true);
    try {
      const response = await checkPPPUserStatus(customerId);
      
      if (response.success) {
        const mikrotikStatus = response.data.mikrotikStatus;
        const isDisabled = mikrotikStatus.disabled;
        setCurrentStatus(isDisabled ? 'disabled' : 'active');
        
        toast.success(`Status MikroTik: ${isDisabled ? 'Disabled' : 'Active'}`);
      } else {
        toast.error(response.message || 'Gagal memeriksa status PPP user');
      }
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan saat memeriksa status');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex gap-1">
      <Button
        onClick={handleDisablePPP}
        disabled={isLoading || currentStatus === 'disabled'}
        variant="destructive"
        size="sm"
        className="h-8 w-8 p-0"
        title="Nonaktifkan PPP User"
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <PowerOff className="h-3 w-3" />
        )}
      </Button>
          
      <Button
        onClick={handleEnablePPP}
        disabled={isLoading || currentStatus === 'active'}
        variant="default"
        size="sm"
        className="h-8 w-8 p-0"
        title="Aktifkan PPP User"
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Power className="h-3 w-3" />
        )}
      </Button>
      
      <Button
        onClick={handleCheckStatus}
        disabled={isChecking}
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        title="Cek Status PPP User"
      >
        {isChecking ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
};

export default PPPUserControl;