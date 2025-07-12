import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReceiptPreview from '../components/ReceiptPreview';
import { getTransactions, getCustomers } from '../utils/api';

const Receipt: React.FC = () => {
  const { receiptNumber } = useParams<{ receiptNumber: string }>();
  const [transaction, setTransaction] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const trxRes = await getTransactions();
      const trx = trxRes.data.find((t: any) => t.receiptNumber === receiptNumber);
      setTransaction(trx);
      if (trx) {
        const custRes = await getCustomers();
        const cust = custRes.data.find((c: any) => c.id === trx.customerId);
        setCustomer(cust);
      }
      setLoading(false);
    };
    fetchData();
  }, [receiptNumber]);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!transaction || !customer) return <div className="flex items-center justify-center h-screen">Nota tidak ditemukan.</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white shadow p-6 rounded w-full max-w-[800px]">
        <ReceiptPreview transaction={transaction} customer={customer} onClose={() => {}} onResend={() => {}} />
      </div>
    </div>
  );
};

export default Receipt;