"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Product, type Enquiry, type Booking } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [enquiryCount, setEnquiryCount] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "", description: "", price: "", category: "handmade", stock: ""
  });
  const [loadingData, setLoadingData] = useState(true);
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/admin");
      } else {
        setAuthed(true);
        loadData();
      }
    });
  }, [router]);

  async function loadData() {
    setLoadingData(true);
    const { data: prods } = await supabase.from("products").select("*").order("category").order("name");
    if (prods) setProducts(prods as Product[]);

    const { count } = await supabase.from("enquiries").select("*", { count: "exact", head: true });
    setEnquiryCount(count || 0);

    const { data: eqs } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(10);
    if (eqs) setEnquiries(eqs as Enquiry[]);

    const { count: bCount } = await supabase.from("bookings").select("*", { count: "exact", head: true });
    setBookingCount(bCount || 0);

    const todayStr = new Date().toISOString().split("T")[0];
    const { data: bks } = await supabase
      .from("bookings")
      .select("*")
      .gte("date", todayStr)
      .order("date", { ascending: true })
      .order("time_slot", { ascending: true })
      .limit(20);
    if (bks) setBookings(bks as Booking[]);

    setLoadingData(false);
  }

  async function cancelBooking(id: string, name: string) {
    if (!confirm(`Cancel the booking for "${name}"? This cannot be undone.`)) return;
    await supabase.from("bookings").delete().eq("id", id);
    loadData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin");
  }

  async function saveStock(id: string) {
    const stock = stockEdits[id];
    if (stock === undefined) return;
    await supabase.from("products").update({ stock }).eq("id", id);
    setStockEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    loadData();
  }

  function onStockChange(id: string, value: number) {
    setStockEdits((prev) => ({ ...prev, [id]: value }));
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await supabase.from("products").delete().eq("id", id);
    loadData();
  }

  async function saveProduct() {
    if (!formData.name.trim()) { alert("Please enter a product name."); return; }
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price) || 0,
      category: formData.category,
      stock: parseInt(formData.stock) || 0,
    };
    if (editingId) {
      const { error } = await supabase.from("products").update(payload).eq("id", editingId);
      if (error) { alert("Error: " + error.message); return; }
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { alert("Error: " + error.message); return; }
    }
    closeModal();
    loadData();
  }

  function openAddModal() {
    setEditingId(null);
    setFormData({ name: "", description: "", price: "", category: "handmade", stock: "" });
    setShowModal(true);
  }

  function openEditModal(product: Product) {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      category: product.category,
      stock: String(product.stock || 0),
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: "", description: "", price: "", category: "handmade", stock: "" });
  }

  if (!authed) {
    return <div className="min-h-screen grid place-items-center text-ink-soft">Loading...</div>;
  }

  const lowStock = products.filter((p) => (p.stock || 0) <= 5);

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-[#FAA989] shadow-sm py-5">
        <div className="container flex justify-between items-center">
          <h1 className="font-display text-[1.4rem] text-ink">The Slime Studio — Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-[0.9rem] text-ink">Lorna</span>
            <button onClick={handleLogout} className="px-5 py-2 rounded-full bg-ink text-white text-[0.85rem] hover:opacity-85 transition-opacity">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="py-10">
        <div className="container">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-10">
            <div className="bg-white rounded-[20px] p-7 shadow-sm">
              <div className="text-[0.8rem] text-ink-soft uppercase tracking-wider mb-2">Total Bookings</div>
              <div className="font-display text-[2rem]">{loadingData ? "--" : bookingCount}</div>
            </div>
            <div className="bg-white rounded-[20px] p-7 shadow-sm">
              <div className="text-[0.8rem] text-ink-soft uppercase tracking-wider mb-2">Total Products</div>
              <div className="font-display text-[2rem]">{loadingData ? "--" : products.length}</div>
            </div>
            <div className="bg-white rounded-[20px] p-7 shadow-sm">
              <div className="text-[0.8rem] text-ink-soft uppercase tracking-wider mb-2">Contact Enquiries</div>
              <div className="font-display text-[2rem]">{loadingData ? "--" : enquiryCount}</div>
            </div>
            <div className="bg-white rounded-[20px] p-7 shadow-sm">
              <div className="text-[0.8rem] text-ink-soft uppercase tracking-wider mb-2">Low Stock Items</div>
              <div className="font-display text-[2rem]">{loadingData ? "--" : lowStock.length}</div>
            </div>
          </div>

          {/* Bookings */}
          <div className="bg-white rounded-[20px] p-8 shadow-sm mb-6">
            <h2 className="font-display text-[1.3rem] mb-6">Upcoming Bookings</h2>
            {loadingData ? (
              <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading bookings...</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-10 text-ink-soft text-[0.9rem]">No upcoming bookings.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-[0.75rem] text-ink-soft uppercase tracking-wider">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Time</th>
                      <th className="pb-3 pr-4">People</th>
                      <th className="pb-3 pr-4">Price</th>
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4">Contact</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-t border-ink/[0.08]">
                        <td className="py-3 pr-4 text-[0.9rem]">{new Date(b.date).toLocaleDateString("en-GB")}</td>
                        <td className="py-3 pr-4 text-[0.9rem]">{b.time_slot}</td>
                        <td className="py-3 pr-4 text-[0.9rem]">{b.people}</td>
                        <td className="py-3 pr-4 text-[0.9rem]">£{Number(b.total_price).toFixed(2)}</td>
                        <td className="py-3 pr-4 text-[0.9rem]">{b.name}</td>
                        <td className="py-3 pr-4 text-[0.9rem]">
                          <div>{b.email}</div>
                          {b.phone && <div className="text-ink-soft text-[0.8rem]">{b.phone}</div>}
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => cancelBooking(b.id, b.name)}
                            className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[0.8rem] hover:bg-red-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Inventory */}
          <div className="bg-white rounded-[20px] p-8 shadow-sm mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-[1.3rem]">Shop Inventory Management</h2>
              <button
                onClick={openAddModal}
                className="px-6 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium hover:-translate-y-0.5 hover:shadow-sm transition-all"
              >
                + Add Product
              </button>
            </div>

            {loadingData ? (
              <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading inventory...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-10 text-ink-soft text-[0.9rem]">No products found. Add your first product!</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-[0.75rem] text-ink-soft uppercase tracking-wider">
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4">Category</th>
                      <th className="pb-3 pr-4">Price</th>
                      <th className="pb-3 pr-4">Stock</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const stock = p.stock || 0;
                      const hasEdit = stockEdits[p.id] !== undefined;
                      return (
                        <tr key={p.id} className="border-t border-ink/[0.08]">
                          <td className="py-3 pr-4 text-[0.9rem]">{p.name}</td>
                          <td className="py-3 pr-4 text-[0.9rem] capitalize">{p.category}</td>
                          <td className="py-3 pr-4 text-[0.9rem]">£{Number(p.price).toFixed(2)}</td>
                          <td className="py-3 pr-4">
                            <input
                              type="number"
                              defaultValue={stock}
                              onChange={(e) => onStockChange(p.id, parseInt(e.target.value) || 0)}
                              className="w-[70px] px-2.5 py-1.5 border-2 border-ink/15 rounded-lg text-[0.9rem] text-center focus:outline-none focus:border-sky-blue-light"
                            />
                          </td>
                          <td className="py-3 pr-4">
                            {stock === 0 ? (
                              <span className="px-3 py-1 rounded-full text-[0.8rem] bg-red-100 text-red-700">Out of stock</span>
                            ) : stock <= 5 ? (
                              <span className="px-3 py-1 rounded-full text-[0.8rem] bg-blush-pop/30 text-ink">Low stock</span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-[0.8rem] bg-sky-blue-light/20 text-ink">In stock</span>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveStock(p.id)}
                                disabled={!hasEdit}
                                className="px-3.5 py-1.5 rounded-full bg-canary-yellow text-ink text-[0.8rem] disabled:opacity-40 hover:opacity-80 transition-opacity"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => openEditModal(p)}
                                className="px-3.5 py-1.5 rounded-full bg-bright-lavender/20 text-ink text-[0.8rem] hover:bg-bright-lavender/30 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteProduct(p.id, p.name)}
                                className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[0.8rem] hover:bg-red-200 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Enquiries */}
          <div className="bg-white rounded-[20px] p-8 shadow-sm">
            <h2 className="font-display text-[1.3rem] mb-6">Recent Contact Enquiries</h2>
            {loadingData ? (
              <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading...</div>
            ) : enquiries.length === 0 ? (
              <div className="text-center py-10 text-ink-soft text-[0.9rem]">No enquiries yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-[0.75rem] text-ink-soft uppercase tracking-wider">
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Message</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map((e) => (
                      <tr key={e.id} className="border-t border-ink/[0.08]">
                        <td className="py-3 pr-4 text-[0.9rem]">{e.name || "--"}</td>
                        <td className="py-3 pr-4 text-[0.9rem]">{e.email || "--"}</td>
                        <td className="py-3 pr-4 text-[0.9rem]">{e.enquiry_type || "--"}</td>
                        <td className="py-3 pr-4 text-[0.9rem] max-w-[200px] truncate">{e.message || "--"}</td>
                        <td className="py-3 text-[0.9rem]">
                          {e.created_at ? new Date(e.created_at).toLocaleDateString("en-GB") : "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-ink/40 z-50 grid place-items-center p-6"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-lg">
            <h3 className="font-display text-[1.3rem] mb-6">{editingId ? "Edit Product" : "Add Product"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Product Name</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Bubblegum Cloud Slime"
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short description"
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Price (£)</label>
                <input
                  type="number"
                  step="0.50"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="8.50"
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                >
                  <option value="handmade">Handmade Slimes</option>
                  <option value="diy">DIY Kits</option>
                  <option value="textures">Slime Textures</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Stock Quantity</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="10"
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={closeModal}
                className="px-6 py-2.5 rounded-full border-2 border-ink/15 text-[0.9rem]"
              >
                Cancel
              </button>
              <button
                onClick={saveProduct}
                className="px-6 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem]"
              >
                {editingId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
