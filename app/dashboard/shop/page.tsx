"use client";

import { useEffect, useState } from "react";
import { supabase, type Product, type ShopSettings } from "@/lib/supabase";

export default function ShopAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [launchDate, setLaunchDate] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "", description: "", price: "", category: "handmade", stock: ""
  });
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: productsData } = await supabase.from("products").select("*").order("category").order("name");
    if (productsData) setProducts(productsData as Product[]);
    const { data: settingsData } = await supabase.from("shop_settings").select("*").eq("id", 1).single();
    if (settingsData) {
      const s = settingsData as ShopSettings;
      setShopSettings(s);
      const d = new Date(s.launch_date);
      setLaunchDate(d.toISOString().slice(0, 16));
    }
    setLoading(false);
  }

  async function toggleShopLive() {
    if (!shopSettings) return;
    const newVal = !shopSettings.live;
    setShopSettings({ ...shopSettings, live: newVal });
    await supabase.from("shop_settings").update({ live: newVal }).eq("id", 1);
  }

  async function saveLaunchDate() {
    if (!launchDate) return;
    setSavingSettings(true);
    const isoDate = new Date(launchDate).toISOString();
    await supabase.from("shop_settings").update({ launch_date: isoDate }).eq("id", 1);
    setSavingSettings(false);
    loadData();
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

  const filtered = categoryFilter === "all" ? products : products.filter((p) => p.category === categoryFilter);
  const lowStock = products.filter((p) => (p.stock || 0) <= 5 && (p.stock || 0) > 0);
  const outOfStock = products.filter((p) => (p.stock || 0) === 0);

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="font-display text-[1.6rem] md:text-[2rem]">Shop</h1>
          <p className="text-ink-soft text-[0.9rem] mt-1">Manage your product catalogue and stock levels.</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-6 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium hover:-translate-y-0.5 hover:shadow-sm transition-all"
        >
          + Add Product
        </button>
      </div>

      {/* Shop Mode + Launch Date */}
      <div className="bg-white rounded-[20px] p-7 shadow-sm mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h2 className="font-display text-[1.1rem] mb-1">Shop Mode</h2>
            <p className="text-[0.85rem] text-ink-soft">
              {shopSettings?.live
                ? "Live — customers can browse and buy products at /shop"
                : "Coming Soon — shop page shows countdown and gift card info"}
            </p>
          </div>
          <button
            onClick={toggleShopLive}
            className={`relative w-16 h-9 rounded-full transition-colors ${shopSettings?.live ? "bg-sky-blue-light" : "bg-ink/15"}`}
          >
            <span
              className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow-sm transition-transform ${
                shopSettings?.live ? "translate-x-7" : ""
              }`}
            />
          </button>
        </div>
        <div className="border-t border-ink/[0.08] pt-6">
          <label className="block text-sm font-medium mb-2">Countdown Launch Date</label>
          <div className="flex gap-3 flex-wrap items-center">
            <input
              type="datetime-local"
              value={launchDate}
              onChange={(e) => setLaunchDate(e.target.value)}
              className="px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
            />
            <button
              onClick={saveLaunchDate}
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-sm transition-all"
            >
              {savingSettings ? "Saving..." : "Update Date"}
            </button>
          </div>
          <p className="text-[0.8rem] text-ink-soft mt-2">
            This date powers the countdown timer on the /shop coming soon page.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-[20px] p-6 shadow-sm">
          <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Total Products</div>
          <div className="font-display text-[1.8rem]">{loading ? "--" : products.length}</div>
        </div>
        <div className="bg-white rounded-[20px] p-6 shadow-sm">
          <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Low Stock</div>
          <div className="font-display text-[1.8rem]">{loading ? "--" : lowStock.length}</div>
        </div>
        <div className="bg-white rounded-[20px] p-6 shadow-sm">
          <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Out of Stock</div>
          <div className="font-display text-[1.8rem]">{loading ? "--" : outOfStock.length}</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {["all", "handmade", "diy", "textures", "accessories"].map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`px-4 py-2 rounded-full text-[0.85rem] font-medium capitalize transition-all ${
              categoryFilter === c ? "bg-sky-blue-light text-ink shadow-sm" : "bg-white text-ink hover:bg-sky-blue-light/20"
            }`}
          >
            {c === "all" ? "All Products" : c}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[20px] p-8 shadow-sm">
        {loading ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading inventory...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">No products found.</div>
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
                {filtered.map((p) => {
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
