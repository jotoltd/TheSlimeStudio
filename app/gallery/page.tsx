"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase, type GalleryImage } from "@/lib/supabase";

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);

  useEffect(() => {
    supabase
      .from("gallery_images")
      .select("*")
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setImages(data as GalleryImage[]);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <Navbar />

      <section
        className="py-[50px] md:py-[70px] text-center"
        style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}
      >
        <div className="container">
          <h1 className="font-display text-[1.5rem] md:text-[3.2rem] mt-3 mb-3 text-ink">
            Our Gallery
          </h1>
          <p className="text-[0.95rem] md:text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            Follow our journey from Holt, Norfolk — slime creations, workshop
            moments and fun from our studio.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading ? (
            <div className="text-center py-10 text-ink-soft">Loading gallery...</div>
          ) : images.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">📸</div>
              <p className="text-ink-soft text-[0.95rem]">
                Photos coming soon! Check back after our next session.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="reveal relative aspect-square rounded-[20px] overflow-hidden cursor-pointer transition-transform hover:scale-105 group"
                  onClick={() => setLightbox(img)}
                >
                  <img
                    src={img.image_url}
                    alt={img.caption}
                    className="w-full h-full object-cover"
                  />
                  {img.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-[0.8rem]">{img.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {lightbox && (
        <div
          className="fixed inset-0 z-[2000] bg-ink/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <img
              src={lightbox.image_url}
              alt={lightbox.caption}
              className="max-w-full max-h-[85vh] rounded-2xl object-contain"
            />
            {lightbox.caption && (
              <p className="text-white text-center text-[0.9rem] mt-3">
                {lightbox.caption}
              </p>
            )}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/20 text-white grid place-items-center hover:bg-white/30 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
