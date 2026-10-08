import React, { useState, useEffect } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import { 
  ClipboardListIcon, 
  ClockIcon, 
  TruckIcon, 
  CheckCircleIcon, 
  ShoppingCartIcon,
  Spinner,
  QrCodeIcon,
  ScanLineIcon,
  ShieldCheckIcon
} from './common/icons';
import type { User, View } from '../types';
import { supabase } from '../services/supabase';
import { OrderHandoverModal } from './OrderHandoverModal';

interface OrdersProps {
  user?: User | null;
  setActiveView?: (view: View) => void;
}

export interface ExtendedOrder {
  id: string;
  date: string;
  items: string[];
  total: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  seller_id?: string;
  buyer_id?: string;
  buyer_name?: string;
  item_name?: string;
}

const mockOrders: ExtendedOrder[] = [
  { id: 'ORD-7782', date: '2023-10-25', items: ['Certified Maize Seeds (2kg)', 'NPK Fertilizer'], total: 430.00, status: 'Processing' },
  { id: 'ORD-7781', date: '2023-10-20', items: ['Heavy-Duty Cutlass'], total: 80.00, status: 'Shipped' },
  { id: 'ORD-7750', date: '2023-10-15', items: ['Knapsack Sprayer'], total: 250.00, status: 'Delivered' },
];

const Orders: React.FC<OrdersProps> = ({ user, setActiveView }) => {
  const [orders, setOrders] = useState<ExtendedOrder[]>(mockOrders);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Pending' | 'Processing' | 'Shipped' | 'Delivered'>('All');
  const [activeTab, setActiveTab] = useState<'all' | 'purchases' | 'sales'>('all');
  
  // QR Handover & Verification State
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverTargetOrder, setHandoverTargetOrder] = useState<ExtendedOrder | null>(null);
  const [handoverInitialTab, setHandoverInitialTab] = useState<'generate' | 'scan' | 'history' | 'sql'>('generate');

  const fetchOrders = async () => {
    if (!user?.uid) {
      setOrders(mockOrders);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`buyer_id.eq.${user.uid},seller_id.eq.${user.uid}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Could not query orders from Supabase (falling back to demo records):", error.message);
        setOrders(mockOrders);
      } else if (data && data.length > 0) {
        const mappedOrders: ExtendedOrder[] = data.map((o: any) => {
          let itemsList: string[] = [];
          if (Array.isArray(o.items) && o.items.length > 0) {
            itemsList = o.items;
          } else if (o.item_name) {
            itemsList = [o.item_name + (o.quantity > 1 ? ` (x${o.quantity})` : '')];
          } else {
            itemsList = ['Agricultural Item'];
          }

          return {
            id: o.id,
            date: o.date || (o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : 'Today'),
            items: itemsList,
            total: Number(o.total) || 0,
            status: (o.status as ExtendedOrder['status']) || 'Processing',
            seller_id: o.seller_id,
            buyer_id: o.buyer_id,
            buyer_name: o.buyer_name,
            item_name: o.item_name
          };
        });
        setOrders(mappedOrders);
      } else {
        setOrders(mockOrders);
      }
    } catch (err) {
      console.warn("Error fetching orders:", err);
      setOrders(mockOrders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const subscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const getStatusIcon = (status: ExtendedOrder['status']) => {
    switch (status) {
      case 'Processing': return <ClockIcon className="w-4 h-4 text-yellow-600" />;
      case 'Shipped': return <TruckIcon className="w-4 h-4 text-blue-600" />;
      case 'Delivered': return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      default: return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ExtendedOrder['status']) => {
    switch (status) {
      case 'Processing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Shipped': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Delivered': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'purchases' && user?.uid && order.buyer_id && order.buyer_id !== user.uid) {
      return false;
    }
    if (activeTab === 'sales' && user?.uid && order.seller_id && order.seller_id !== user.uid) {
      return false;
    }
    if (selectedFilter !== 'All' && order.status !== selectedFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-full text-green-700 shadow-xs">
            <ClipboardListIcon className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Orders & Deliveries</h2>
            <p className="text-sm text-gray-600">Track and manage your agricultural purchases and sales.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setHandoverTargetOrder(orders[0] || null);
              setHandoverInitialTab('scan');
              setIsHandoverModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold py-2 px-3 rounded-lg bg-green-50 text-green-900 border border-green-300 hover:bg-green-100 transition-colors shadow-2xs"
          >
            <ScanLineIcon className="w-4 h-4 text-green-700" />
            <span>Scan Handover QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setHandoverTargetOrder(orders[0] || null);
              setHandoverInitialTab('history');
              setIsHandoverModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold py-2 px-3 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <QrCodeIcon className="w-4 h-4 text-green-700" />
            <span>Handover Hub</span>
          </button>

          {setActiveView && (
            <Button
              onClick={() => setActiveView('MARKETPLACE')}
              className="text-xs py-2 px-3 bg-green-700 hover:bg-green-800 text-white"
            >
              <ShoppingCartIcon className="w-3.5 h-3.5 mr-1" /> New Order
            </Button>
          )}
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        {user?.type === 'seller' || user?.type === 'admin' ? (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'all' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Orders
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'sales' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sales (Received)
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'purchases' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Purchases
            </button>
          </div>
        ) : (
          <div className="text-xs text-gray-500 font-medium">
            Showing purchase and delivery milestones
          </div>
        )}

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['All', 'Processing', 'Shipped', 'Delivered'] as const).map(status => (
            <button
              key={status}
              onClick={() => setSelectedFilter(status)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                selectedFilter === status 
                  ? 'bg-green-800 text-white border-green-800 font-bold' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-8 h-8 text-green-600" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="text-center py-12">
          <ClipboardListIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-700 mb-1">No Orders Found</h3>
          <p className="text-sm text-gray-500 mb-4">No orders match the selected filter criteria.</p>
          {setActiveView && (
            <Button onClick={() => setActiveView('MARKETPLACE')} className="bg-green-700 hover:bg-green-800 text-white text-sm">
              Browse Marketplace
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isMySale = user?.uid && order.seller_id === user.uid;
            return (
              <Card key={order.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
                <div className="flex-grow space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900">{order.id}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                    {isMySale && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Seller Fulfillment
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">
                    Placed on {order.date} {order.buyer_name ? `• Buyer: ${order.buyer_name}` : ''}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {order.items.map((item, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-md border border-gray-200 font-medium">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-left md:text-right min-w-[140px] pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 w-full md:w-auto flex md:flex-col justify-between items-end gap-2">
                  <div>
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="text-lg sm:text-xl font-bold text-green-700">GHS {order.total.toFixed(2)}</p>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {order.status === 'Delivered' ? 'Escrow Released' : 'Escrow Protected'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setHandoverTargetOrder(order);
                      setHandoverInitialTab(order.status === 'Delivered' ? 'generate' : 'generate');
                      setIsHandoverModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border text-green-800 bg-green-50 hover:bg-green-100 border-green-300 transition-colors shadow-2xs"
                  >
                    <QrCodeIcon className="w-3.5 h-3.5 text-green-700" />
                    <span>{order.status === 'Delivered' ? 'Fulfillment Slip' : 'QR Handover Pass'}</span>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* QR Handover, Physical Inspection & Payment Verification Modal */}
      {isHandoverModalOpen && (
        <OrderHandoverModal
          isOpen={isHandoverModalOpen}
          onClose={() => setIsHandoverModalOpen(false)}
          order={handoverTargetOrder}
          user={user}
          initialTab={handoverInitialTab}
          onHandoverCompleted={() => {
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};

export default Orders;
