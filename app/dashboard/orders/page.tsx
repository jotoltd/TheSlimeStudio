"use client";

import { useEffect, useState } from "react";
import { supabase, type ShopOrder } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader";
import PaymentMethodBadge from "@/components/PaymentMethodBadge";

export default function OrdersPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    setLoading(true);
    const { data } = await supabase.from("shop_orders").select("*").order("created_at", { ascending: false });
    if (data) setOrders(data as ShopOrder[]);
    setLoading(false);
  }

  async function updateOrderStatus(id: string, status: string) {
    await supabase.from("shop_orders").update({ payment_status: status }).eq("id", id);
    loadOrders();
    if (selectedOrder?.id === id) {
      setSelectedOrder({ ...selectedOrder, payment_status: status });
    }
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.payment_status === filter);

  const statusColors: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    expired: "bg-gray-100 text-gray-500",
    refunded: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <PageHeader title="Shop Orders" subtitle="View and manage customer orders from the shop." />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider mb-1">Total Orders</div>
          <div className="font-display text-[1.5rem]">{loading ? "--" : orders.length}</div>
        </div>
        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider mb-1">Paid</div>
          <div className="font-display text-[1.5rem]">{loading ? "--" : orders.filter((o) => o.payment_status === "paid").length}</div>
        </div>
        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider mb-1">Revenue</div>
          <div className="font-display text-[1.5rem]">£{loading ? "--" : orders.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total), 0).toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider mb-1">Pending</div>
          <div className="font-display text-[1.5rem]">{loading ? "--" : orders.filter((o) => o.payment_status === "pending").length}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {["all", "paid", "pending", "expired", "refunded"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-[0.85rem] font-medium capitalize transition-all ${filter === f ? "bg-sky-blue-light text-ink shadow-sm" : "bg-white text-ink hover:bg-sky-blue-light/20"}`}
          >
            {f === "all" ? "All Orders" : f}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
        {loading ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-[0.75rem] text-ink-soft uppercase tracking-wider">
                  <th className="pb-3 pr-4">Order</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Items</th>
                  <th className="pb-3 pr-4">Total</th>
                  <th className="pb-3 pr-4">Delivery</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Method</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-ink/[0.08]">
                    <td className="py-3 pr-4 text-[0.85rem] font-medium">{o.order_number}</td>
                    <td className="py-3 pr-4 text-[0.85rem]">
                      <div>{o.customer_name}</div>
                      <div className="text-[0.75rem] text-ink-soft">{o.customer_email}</div>
                    </td>
                    <td className="py-3 pr-4 text-[0.85rem]">{o.items.length} item{o.items.length === 1 ? "" : "s"}</td>
                    <td className="py-3 pr-4 text-[0.85rem] font-medium">£{Number(o.total).toFixed(2)}</td>
                    <td className="py-3 pr-4 text-[0.85rem] capitalize">{o.shipping_method}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-3 py-1 rounded-full text-[0.75rem] font-medium capitalize ${statusColors[o.payment_status] || "bg-gray-100 text-gray-500"}`}>
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <PaymentMethodBadge reference={o.stripe_session_id} />
                    </td>
                    <td className="py-3 pr-4 text-[0.8rem] text-ink-soft">
                      {new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="px-3.5 py-1.5 rounded-full bg-bright-lavender/20 text-ink text-[0.8rem] hover:bg-bright-lavender/30 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-ink/40 z-50 grid place-items-center p-6"
          onClick={(e) => e.target === e.currentTarget && setSelectedOrder(null)}
        >
          <div className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-[1.3rem]">{selectedOrder.order_number}</h3>
                <p className="text-[0.8rem] text-ink-soft">
                  {new Date(selectedOrder.created_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-full hover:bg-ink/5 grid place-items-center text-ink/60">✕</button>
            </div>

            {/* Customer info */}
            <div className="bg-ink/[0.03] rounded-xl p-4 mb-4">
              <div className="text-[0.85rem] space-y-1">
                <div><strong>Name:</strong> {selectedOrder.customer_name}</div>
                <div><strong>Email:</strong> {selectedOrder.customer_email}</div>
                {selectedOrder.customer_phone && <div><strong>Phone:</strong> {selectedOrder.customer_phone}</div>}
                <div><strong>Delivery:</strong> {selectedOrder.shipping_method === "collection" ? "Collection from studio" : "Delivery"}</div>
                {selectedOrder.shipping_method === "delivery" && selectedOrder.shipping_address && (
                  <div><strong>Address:</strong> {selectedOrder.shipping_address}{selectedOrder.shipping_city ? `, ${selectedOrder.shipping_city}` : ""}{selectedOrder.shipping_postcode ? `, ${selectedOrder.shipping_postcode}` : ""}</div>
                )}
                {selectedOrder.notes && <div><strong>Notes:</strong> {selectedOrder.notes}</div>}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
              {selectedOrder.items.map((item, i) => (
                <div key={i} className="flex justify-between text-[0.85rem]">
                  <span>{item.name} × {item.quantity}</span>
                  <span>£{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-ink/10 pt-3 space-y-1 text-[0.85rem]">
              <div className="flex justify-between text-ink-soft"><span>Subtotal</span><span>£{Number(selectedOrder.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between text-ink-soft"><span>Shipping</span><span>{Number(selectedOrder.shipping_cost) === 0 ? "Free" : `£${Number(selectedOrder.shipping_cost).toFixed(2)}`}</span></div>
              <div className="flex justify-between font-display text-[1.1rem] pt-1"><span>Total</span><span>£{Number(selectedOrder.total).toFixed(2)}</span></div>
            </div>

            {/* Status management */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">Order Status</label>
              <div className="flex gap-2 flex-wrap">
                {["paid", "pending", "refunded", "cancelled"].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateOrderStatus(selectedOrder.id, s)}
                    className={`px-4 py-2 rounded-full text-[0.8rem] font-medium capitalize transition-all ${selectedOrder.payment_status === s ? "bg-sky-blue-light text-ink shadow-sm" : "bg-ink/5 text-ink-soft hover:bg-ink/10"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
