import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import Image from "next/image";
import { Package, Tag, Layers, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requireAuth();

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { category: "asc" },
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Product Master & Stock Thresholds
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-plum tracking-tight mt-0.5">
            Confectionery & Product Catalogue
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Handcrafted artisanal bars, royal pralines, champagne gold truffles, and festive gift boxes.
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-cream-muted border border-gold-300 text-gold-900">
          {products.length} Active SKUs &bull; INR (₹)
        </span>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl border border-cream-border overflow-hidden shadow-luxury hover:border-gold-400 hover:shadow-gold transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Image banner */}
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
                <div className="absolute top-2.5 right-2.5 bg-plum/85 backdrop-blur-sm text-gold-300 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase border border-gold-400/40">
                  {p.category.replace(/_/g, " ")}
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                <span className="font-mono text-[10px] font-bold text-neutralMuted block mb-0.5">
                  SKU: {p.sku}
                </span>
                <h3 className="font-serif font-bold text-base text-plum leading-snug">
                  {p.name}
                </h3>
                <p className="text-xs text-cocoa/80 mt-1 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              </div>
            </div>

            {/* Price & Threshold Strip */}
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
    </div>
  );
}
