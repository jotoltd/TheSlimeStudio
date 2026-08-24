"use client";

import { useEffect, useState, useRef } from "react";
import { supabase, type GalleryImage } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import PageHeader from "@/components/PageHeader";

export default function GalleryAdminPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("gallery_images")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setImages(data as GalleryImage[]);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const fileName = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery-images")
        .upload(fileName, file);

      if (uploadError) {
        toast(`Upload failed: ${uploadError.message}`, "error");
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("gallery-images")
        .getPublicUrl(fileName);

      const sortOrder = images.length + i;
      const { error: insertError } = await supabase
        .from("gallery_images")
        .insert({
          image_url: urlData.publicUrl,
          caption: caption || file.name.replace(/\.[^/.]+$/, ""),
          sort_order: sortOrder,
          is_visible: true,
        });

      if (insertError) {
        toast(`Failed to save: ${insertError.message}`, "error");
      }
    }

    setCaption("");
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast("Photos uploaded!");
    load();
  }

  async function toggleVisible(img: GalleryImage) {
    const { error } = await supabase
      .from("gallery_images")
      .update({ is_visible: !img.is_visible })
      .eq("id", img.id);
    if (error) { toast("Failed to update", "error"); return; }
    setImages(images.map((i) => (i.id === img.id ? { ...i, is_visible: !i.is_visible } : i)));
  }

  async function updateCaption(img: GalleryImage, newCaption: string) {
    const { error } = await supabase
      .from("gallery_images")
      .update({ caption: newCaption })
      .eq("id", img.id);
    if (error) { toast("Failed to update caption", "error"); return; }
    setImages(images.map((i) => (i.id === img.id ? { ...i, caption: newCaption } : i)));
  }

  async function deleteImage(img: GalleryImage) {
    const { error } = await supabase
      .from("gallery_images")
      .delete()
      .eq("id", img.id);
    if (error) { toast("Failed to delete", "error"); return; }
    setImages(images.filter((i) => i.id !== img.id));
    toast("Photo deleted");
  }

  async function reorder(draggedId: string, targetId: string) {
    const dragged = images.find((i) => i.id === draggedId);
    const target = images.find((i) => i.id === targetId);
    if (!dragged || !target) return;

    const newImages = [...images];
    const draggedIdx = newImages.findIndex((i) => i.id === draggedId);
    const targetIdx = newImages.findIndex((i) => i.id === targetId);
    newImages.splice(draggedIdx, 1);
    newImages.splice(targetIdx, 0, dragged);
    setImages(newImages);

    const updates = newImages.map((img, idx) => ({
      id: img.id,
      sort_order: idx,
    }));

    for (const u of updates) {
      await supabase.from("gallery_images").update({ sort_order: u.sort_order }).eq("id", u.id);
    }
  }

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <PageHeader title="Gallery" subtitle="Upload and manage photos for the public gallery page" />

      {/* Upload section */}
      <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm mb-6">
        <h2 className="font-display text-[1.1rem] mb-4">Add Photos</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Caption (optional)</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Saturday slime session fun!"
              className="w-full max-w-md px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
            />
            <p className="text-[0.75rem] text-ink-soft mt-1">
              If left blank, the file name will be used. You can edit captions after uploading.
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-6 py-3 rounded-xl bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-sm transition-all"
            >
              {uploading ? "Uploading..." : "Choose Photos to Upload"}
            </button>
          </div>
        </div>
      </div>

      {/* Gallery grid */}
      {loading ? (
        <div className="text-center py-10 text-ink-soft">Loading gallery...</div>
      ) : images.length === 0 ? (
        <div className="bg-white rounded-[20px] p-10 shadow-sm text-center">
          <div className="text-3xl mb-3">📸</div>
          <p className="text-ink-soft text-[0.9rem]">No photos yet. Upload some to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => setDraggedId(img.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (draggedId && draggedId !== img.id) reorder(draggedId, img.id); setDraggedId(null); }}
              className={`bg-white rounded-[16px] shadow-sm overflow-hidden group cursor-move ${!img.is_visible ? "opacity-50" : ""}`}
            >
              <div className="relative aspect-square">
                <img src={img.image_url} alt={img.caption} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => toggleVisible(img)}
                    className="w-9 h-9 rounded-full bg-white/90 grid place-items-center text-[0.8rem] hover:bg-white transition-colors"
                    title={img.is_visible ? "Hide" : "Show"}
                  >
                    {img.is_visible ? "👁" : "🚫"}
                  </button>
                  <button
                    onClick={() => deleteImage(img)}
                    className="w-9 h-9 rounded-full bg-red-500 text-white grid place-items-center text-[0.8rem] hover:bg-red-600 transition-colors"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-3">
                <input
                  type="text"
                  value={img.caption}
                  onChange={(e) => updateCaption(img, e.target.value)}
                  className="w-full text-[0.8rem] text-ink-soft bg-transparent border-none focus:outline-none focus:ring-0"
                  placeholder="Add caption..."
                />
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[0.65rem] bg-ink/5 px-2 py-0.5 rounded-full text-ink-soft">
                    #{img.sort_order + 1}
                  </span>
                  {!img.is_visible && (
                    <span className="text-[0.65rem] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      Hidden
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-[0.75rem] text-ink-soft mt-4 text-center">
          Drag and drop photos to reorder. Changes save automatically.
        </p>
      )}
    </div>
  );
}
