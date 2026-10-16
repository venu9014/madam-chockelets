import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Package,
  Layers,
  Heart,
  ExternalLink,
} from "lucide-react";

export default function PublicShowcasePage() {
  const collections = [
    {
      title: "Single-Origin Dark Bars",
      subtitle: "70% Malabar & Wild Cacao",
      image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600",
      description: "Intense volcanic terroir with natural notes of dried plum, dark berries, and roasted cocoa bean caviar.",
    },
    {
      title: "Royal Velvet Pralines",
      subtitle: "Handcrafted 12-Piece Collection",
      image: "https://images.unsplash.com/photo-1526081347589-7fa3cb41b4b2?w=600",
      description: "Infused with organic Kashmiri saffron, crushed green cardamom, and French sea salt fleur de sel.",
    },
    {
      title: "Champagne & 24k Gold Truffles",
      subtitle: "Celebration 16-Piece Vault",
      image: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600",
      description: "Slow-simmered champagne ganache enrobed in single-estate dark chocolate and gilded in pure edible gold luster.",
    },
    {
      title: "The Grand Empress Hamper",
      subtitle: "Flagship Violet Gift Chest",
      image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600",
      description: "Bespoke royal violet leatherette chest featuring artisan bars, praline jewels, almond dragees, and ceremonial drinking cacao.",
    },
  ];

  const boutiques = [
    {
      name: "Indiranagar Boutique & Atelier",
      address: "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru",
      time: "10:00 AM – 10:30 PM",
      phone: "+91 80 4125 0001",
    },
    {
      name: "Koramangala Flagship Confectionery",
      address: "80 Feet Road, 4th Block, Koramangala, Bengaluru",
      time: "10:00 AM – 11:00 PM",
      phone: "+91 80 4125 0002",
    },
    {
      name: "Whitefield Salon & Tasting Room",
      address: "Prestige Ozone Gate, ITPL Main Road, Whitefield, Bengaluru",
      time: "10:00 AM – 10:00 PM",
      phone: "+91 80 4125 0003",
    },
  ];

  return (
    <div className="min-h-screen bg-cream font-sans text-cocoa selection:bg-gold-200">
      {/* Editorial Luxury Top Bar */}
      <div className="bg-plum text-cream-muted text-center py-2 px-4 text-xs border-b border-gold-500/30 flex items-center justify-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-gold-300 font-semibold tracking-wider text-[11px] uppercase">
          <Sparkles className="w-3.5 h-3.5 text-gold-400" />
          The Madam Chocolate Autumn Confectionery Edit
        </span>
        <span className="hidden sm:inline">&bull;</span>
        <Link
          href="/dashboard"
          className="text-white hover:text-gold-300 font-semibold underline underline-offset-2 flex items-center gap-1"
        >
          <span>Launch Operations Console</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-cream-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-plum border-2 border-gold-400 flex items-center justify-center text-gold-400 font-serif font-black text-xl shadow-luxury">
            MC
          </div>
          <div>
            <span className="font-serif font-black text-plum tracking-wider text-lg block leading-none">
              MADAM CHOCOLATE
            </span>
            <span className="text-[10px] uppercase tracking-widest text-gold-700 font-semibold block mt-0.5">
              Atelier & Boutiques
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2 bg-plum text-gold-400 rounded-lg border border-gold-400 hover:bg-plum-light transition-colors shadow-sm"
          >
            Staff Portal Login
          </Link>
          <Link
            href="/dashboard"
            className="text-xs font-semibold px-4 py-2 bg-gold-500 hover:bg-gold-600 text-plum rounded-lg shadow-gold transition-colors flex items-center gap-1.5"
          >
            <span>Live Operations Demo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Editorial Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blush/60 text-violet-900 border border-blush-300 text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-violet-700" />
            Contemporary Indian Confectionery Craft
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black text-plum leading-tight tracking-tight">
            Chocolate reimagined through{" "}
            <span className="text-gold-700 italic">royal indulgence</span> &amp; modern discipline.
          </h1>

          <p className="text-base text-cocoa/90 leading-relaxed max-w-xl font-light">
            Rooted in single-origin Indian cacao and finished with delicate saffron, wild cardamom, and sea salt caramel. Every praline, truffle, and velvet bar is sculpted daily across our Bengaluru boutique ateliers.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Link
              href="/dashboard"
              className="px-6 py-3.5 bg-plum text-gold-400 font-serif font-bold text-sm rounded-xl border border-gold-400 shadow-luxury hover:bg-plum-light transition-all flex items-center justify-center gap-2"
            >
              <span>Explore Operations Dashboard</span>
              <ArrowRight className="w-4 h-4 text-gold-400" />
            </Link>

            <Link
              href="/dashboard/products"
              className="px-6 py-3.5 bg-white text-plum font-semibold text-sm rounded-xl border border-cream-border hover:border-gold-300 shadow-sm transition-all text-center"
            >
              View Chocolate Catalogue (18 SKUs)
            </Link>
          </div>
        </div>

        {/* Hero Visual Plinth Composition */}
        <div className="relative">
          <div className="relative rounded-3xl overflow-hidden border-2 border-gold-400 shadow-luxury-lg bg-plum-dark aspect-[4/3]">
            <img
              src="https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800"
              alt="Madam Chocolate Artisan Truffles"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-plum via-transparent to-transparent opacity-80" />

            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-plum/90 backdrop-blur-md border border-gold-400/50 text-cream">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold-400 block mb-1">
                Atelier Signature
              </span>
              <p className="font-serif font-bold text-lg text-white">
                The Grand Empress Gift Hamper &bull; ₹4,850
              </p>
              <p className="text-xs text-cream-muted mt-0.5">
                Bespoke royal violet keepsake chest with 24k gold gilded truffles &amp; Malabar single-origin bars.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Collections Grid */}
      <section className="bg-white py-20 border-y border-cream-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-gold-700 block mb-1">
              Curated Masterpieces
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-plum">
              The Madam Confectionery Collections
            </h2>
            <p className="text-xs text-cocoa/80 mt-2">
              Each confection follows rigorous temperature standards, fresh cream infusions, and certified fair-trade Indian cacao farming.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {collections.map((item, idx) => (
              <div
                key={idx}
                className="bg-cream rounded-2xl border border-cream-border overflow-hidden shadow-sm hover:border-gold-400 hover:shadow-gold transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="h-52 overflow-hidden relative">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-plum/85 backdrop-blur-sm text-gold-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-gold-400/30">
                      Artisan Batch
                    </div>
                  </div>

                  <div className="p-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold-800 block mb-1">
                      {item.subtitle}
                    </span>
                    <h3 className="font-serif font-bold text-lg text-plum leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-cocoa/80 mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-3 border-t border-cream-border flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-neutralMuted">
                    Daily Fresh Production
                  </span>
                  <Link
                    href="/dashboard"
                    className="font-semibold text-gold-700 group-hover:text-gold-900 flex items-center gap-0.5"
                  >
                    Operations &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Boutique Locations Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-gold-700 block mb-1">
            Retail Boutiques
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-black text-plum">
            Visit Our Bengaluru Salons
          </h2>
          <p className="text-xs text-cocoa/80 mt-2">
            Each store is equipped with temperature-controlled plinths and interactive chocolate tasting bars.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {boutiques.map((b, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl border border-cream-border shadow-luxury hover:border-gold-300 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-800 mb-4">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-plum mb-1">{b.name}</h3>
              <p className="text-xs text-cocoa/80 mb-4">{b.address}</p>

              <div className="pt-3 border-t border-cream-border text-xs text-neutralMuted space-y-1">
                <p>Hours: <strong className="text-plum">{b.time}</strong></p>
                <p>Concierge: <strong className="text-plum">{b.phone}</strong></p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-plum text-cream-muted border-t border-gold-500/30 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-plum-dark border border-gold-400 flex items-center justify-center text-gold-400 font-serif font-bold text-sm">
              MC
            </div>
            <div>
              <span className="font-serif font-bold text-white text-sm block">
                MADAM CHOCOLATE
              </span>
              <span className="text-[10px] text-gold-400">
                Digital Operations &amp; Retail Confectionery Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <Link href="/dashboard" className="text-gold-300 hover:text-white transition-colors">
              Operations Console
            </Link>
            <Link href="/login" className="text-gold-300 hover:text-white transition-colors">
              Staff Portal
            </Link>
            <Link href="/dashboard/sops" className="text-gold-300 hover:text-white transition-colors">
              SOP Protocols
            </Link>
          </div>

          <p className="text-[11px] text-neutralMuted">
            &copy; 2026 MADAM CHOCOLATE. All Rights Reserved. Fictional Demonstration System.
          </p>
        </div>
      </footer>
    </div>
  );
}
