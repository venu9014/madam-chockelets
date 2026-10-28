"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Edit2,
  CheckCircle2,
  DollarSign,
  Layers,
  Sparkles,
  X,
  Cake,
  RefreshCw,
} from "lucide-react";
import { BAKERY_CATEGORIES, getBakeryCategoryLabel } from "@/lib/bakery-categories";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  unitOfMeasure: string;
  costPrice: number;
  sellingPrice: number;
  minStockThreshold: number;
  imageUrl: string | null;
  active: boolean;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    category: "CAKES_PASTRIES",
    description: "",
    unitOfMeasure: "PIECE",
    costPrice: "",
    sellingPrice: "",
    minStockThreshold: "10",
    imageUrl: "",
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== "ALL") params.append("category", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error("Failed to load products", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, searchQuery]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      sku: `MC-BAKE-${Math.floor(100 + Math.random() * 900)}`,
      name: "",
      category: "CAKES_PASTRIES",
      description: "",
      unitOfMeasure: "PIECE",
      costPrice: "",
      sellingPrice: "",
      minStockThreshold: "10",
      imageUrl: "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      category: p.category,
      description: p.description,
      unitOfMeasure: p.unitOfMeasure,
      costPrice: p.costPrice.toString(),
      sellingPrice: p.sellingPrice.toString(),
      minStockThreshold: p.minStockThreshold.toString(),
      imageUrl: p.imageUrl || "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchProducts();
      } else {
        setFormError(data.error || "Failed to save product.");
      }
    } catch (err) {
      setFormError("Network error saving product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Confectionery Inventory & Master Catalogue
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-plum tracking-tight mt-0.5">
            Product Catalog
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Artisanal celebration cakes, French pastries, sourdough loaves, croissants, cookies, and chocolate confections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-cream-muted border border-gold-300 text-gold-900 shadow-sm">
            {products.length} Active SKUs &bull; INR (₹)
          </span>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-600 hover:bg-gold-700 text-white font-semibold text-xs shadow-gold transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-cream-border p-4 shadow-luxury space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutralMuted" />
            <input
              type="text"
              placeholder="Search by product name, SKU (e.g. MC-CAKE-01), or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-cream-border text-xs focus:outline-none focus:border-gold-500"
            />
          </div>

          {/* Quick Refresh */}
          <button
            onClick={fetchProducts}
            className="p-2 rounded-lg border border-cream-border text-neutralMuted hover:text-plum hover:bg-cream/40 transition-colors"
            title="Refresh catalogue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Category Pills Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
              selectedCategory === "ALL"
                ? "bg-plum text-gold-300 font-bold shadow-sm"
                : "bg-cream-muted text-neutralMuted hover:text-plum hover:bg-cream"
            }`}
          >
            All Categories
          </button>

          {BAKERY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-plum text-gold-300 font-bold shadow-sm"
                  : "bg-cream-muted text-neutralMuted hover:text-plum hover:bg-cream"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="py-20 text-center text-neutralMuted">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-gold-600 mb-2" />
          <p className="text-xs">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-cream-border p-12 text-center shadow-luxury">
          <Cake className="w-12 h-12 mx-auto text-gold-400 opacity-60 mb-3" />
          <h3 className="font-bold text-plum text-base">No Products Found</h3>
          <p className="text-xs text-neutralMuted mt-1 max-w-sm mx-auto">
            No products match the selected category or search filter. Only approved categories are displayed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-cream-border overflow-hidden shadow-luxury hover:border-gold-400 hover:shadow-gold transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Image Banner */}
                <div className="relative h-44 w-full bg-cream-muted overflow-hidden">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gold-600 bg-gold-50">
                      <Package className="w-8 h-8 opacity-40" />
                    </div>
                  )}

                  {/* Category Badge */}
                  <div className="absolute top-2.5 right-2.5 bg-plum/90 backdrop-blur-sm text-gold-300 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase border border-gold-400/40">
                    {getBakeryCategoryLabel(p.category)}
                  </div>

                  {/* Edit Overlay Button */}
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="absolute top-2.5 left-2.5 p-1.5 bg-white/90 backdrop-blur-sm text-plum rounded-lg shadow-sm hover:bg-gold-500 hover:text-white transition-colors"
                    title="Edit Product"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-4">
                  <span className="font-mono text-[10px] font-bold text-neutralMuted block mb-0.5">
                    SKU: {p.sku} &bull; {p.unitOfMeasure}
                  </span>
                  <h3 className="font-serif font-bold text-base text-plum leading-snug line-clamp-1">
                    {p.name}
                  </h3>
                  <p className="text-xs text-cocoa/80 mt-1 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </div>

              {/* Price & Safety Stock Strip */}
              <div className="p-4 pt-3 border-t border-cream-border bg-cream/40 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-neutralMuted block">Cost / Selling</span>
                  <span className="font-serif font-bold text-plum">
                    ₹{p.costPrice.toFixed(0)} /{" "}
                    <strong className="text-gold-800">₹{p.sellingPrice.toFixed(0)}</strong>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-neutralMuted block">Min Safety Stock</span>
                  <span className="font-mono font-bold text-neutralMuted">
                    {p.minStockThreshold} {p.unitOfMeasure.toLowerCase()}s
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-plum/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-cream-border shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-cream-border flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-700 block">
                  Confectionery Inventory Master
                </span>
                <h3 className="font-bold text-lg text-plum">
                  {editingProduct ? "Edit Product" : "Create New Product"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-neutralMuted hover:text-plum hover:bg-cream/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Product SKU *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-cream-border focus:outline-none focus:border-gold-500 font-mono disabled:bg-cream-muted"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">
                    Product Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-cream-border focus:outline-none focus:border-gold-500"
                  >
                    {BAKERY_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Royal Opera Cake Slice (Single Origin Cacao)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-cream-border focus:outline-none focus:border-gold-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Artisan ingredients, baking methods, flavor profile, allergens..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-cream-border focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Unit of Measure</label>
                  <select
                    value={formData.unitOfMeasure}
                    onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-cream-border focus:outline-none focus:border-gold-500"
                  >
                    <option value="PIECE">Piece</option>
                    <option value="BOX">Box</option>
                    <option value="PACK">Pack</option>
                    <option value="KG">Kg</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Cost Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="180.00"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-cream-border focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="420.00"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-cream-border focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Min Safety Stock</label>
                  <input
                    type="number"
                    required
                    value={formData.minStockThreshold}
                    onChange={(e) => setFormData({ ...formData, minStockThreshold: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-cream-border focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Product Photo URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-cream-border focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-cream-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-cream-border text-xs text-neutralMuted hover:bg-cream/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gold-600 hover:bg-gold-700 text-white font-semibold text-xs shadow-gold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
