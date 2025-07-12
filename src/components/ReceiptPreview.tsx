import React from 'react';
import { Button } from '@/components/ui/button';

interface ReceiptPreviewProps {
  transaction: any;
  customer: any;
  onClose: () => void;
  onResend: () => void;
}

const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ transaction, customer, onClose, onResend }) => {
  return (
    <div className="bg-white p-8 rounded-lg shadow max-w-[800px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-700">INVOICE / NOTA PEMBAYARAN</h2>
          <div className="text-sm text-gray-600">{customer?.companyName || 'LATANSA NETWORKS'}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold">No. Nota: {transaction.receiptNumber}</div>
          <div className="text-sm">Tanggal: {new Date(transaction.createdAt).toLocaleDateString('id-ID')}</div>
          <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded mt-2 text-xs font-bold">LUNAS</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div><span className="font-semibold">Nama:</span> {customer.name}</div>
          <div><span className="font-semibold">No. Pelanggan:</span> {customer.customerNumber}</div>
          <div><span className="font-semibold">Alamat:</span> {customer.address}</div>
          <div><span className="font-semibold">Telepon:</span> {customer.phone}</div>
        </div>
        <div>
          <div><span className="font-semibold">Paket:</span> {customer.package}</div>
          <div><span className="font-semibold">Periode:</span> {transaction.period && transaction.period.from && transaction.period.to ? `${new Date(transaction.period.from).toLocaleDateString('id-ID')} - ${new Date(transaction.period.to).toLocaleDateString('id-ID')}` : '-'}</div>
          <div><span className="font-semibold">Metode:</span> {transaction.method === 'cash' ? 'Tunai' : 'Transfer'}</div>
        </div>
      </div>
      <table className="w-full mb-4 border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Deskripsi</th>
            <th className="p-2 border">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 border">{transaction.description}</td>
            <td className="p-2 border text-right">Rp {transaction.amount.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-bold">
            <td className="p-2 border text-right">Total</td>
            <td className="p-2 border text-right">Rp {transaction.amount.toLocaleString('id-ID')}</td>
          </tr>
        </tfoot>
      </table>
      <div className="flex justify-between items-end mt-8">
        <div>
          <div className="mb-2 text-sm text-gray-600">Pembayaran dapat ditransfer ke:</div>
          <div className="font-semibold">BCA 1234567890 a.n. LATANSA NETWORKS</div>
        </div>
        <div className="text-center">
          <div className="mb-12">&nbsp;</div>
          <div className="font-semibold">( {transaction.receivedBy || 'Admin'} )</div>
          <div className="text-xs text-gray-500">Penerima</div>
        </div>
      </div>
      <div className="mt-8 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Tutup</Button>
        <Button onClick={() => window.print()}>Print/Save PDF</Button>
        <Button variant="outline" onClick={onResend}>Kirim ke WhatsApp</Button>
      </div>
    </div>
  );
};

export default ReceiptPreview;