import type { Product } from "@/lib/supabase";

const categoryLabels: Record<string, string> = {
  handmade: "Handmade",
  diy: "DIY Kit",
  textures: "Texture",
  accessories: "Accessory",
};

const categoryGradients: Record<string, string> = {
  handmade: "from-[#64d8ec] to-[#abf7dc]",
  diy: "from-[#E0B0FF] to-[#CBC3E3]",
  textures: "from-[#ffc4fb] to-[#E0B0FF]",
  accessories: "from-[#CBC3E3] to-[#abf7dc]",
};

const categoryEmojis: Record<string, string> = {
  handmade: "🫧",
  diy: "📦",
  textures: "✨",
  accessories: "🎁",
};

export default function ProductCard({ product }: { product: Product }) {
  const outOfStock = (product.stock || 0) === 0;

  return (
    <div className="reveal group cursor-pointer transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-lg rounded-2xl overflow-hidden bg-white shadow-md">
      <div
        className={`relative aspect-square grid place-items-center bg-gradient-to-br ${
          categoryGradients[product.category] || "from-[#ffc4fb] to-[#64d8ec]"
        } overflow-hidden`}
      >
        <span className="absolute top-3 left-3 bg-ink/80 text-white text-xs px-3 py-1 rounded-full">
          {categoryLabels[product.category] || product.category}
        </span>
        {outOfStock && (
          <span className="absolute top-3 right-3 bg-red-400/80 text-white text-xs px-3 py-1 rounded-full">
            Out of stock
          </span>
        )}
        <span className="text-[3.5rem]">{categoryEmojis[product.category] || "🫧"}</span>
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg mb-1">{product.name}</h3>
        <p className="text-sm text-ink-soft mb-4">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="font-display text-lg">£{Number(product.price).toFixed(2)}</span>
          <button
            disabled={outOfStock}
            className={`w-9 h-9 rounded-full text-lg flex items-center justify-center transition-all ${
              outOfStock
                ? "bg-gray-300 text-gray-400 cursor-not-allowed opacity-50"
                : "bg-[#64d8ec] text-ink hover:bg-[#4cc5db] hover:scale-110"
            }`}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
