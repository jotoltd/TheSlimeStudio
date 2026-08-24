"use client";

import { useEffect, useState } from "react";
import { supabase, type FAQ } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import PageHeader from "@/components/PageHeader";

export default function FAQsAdminPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("faqs")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setFaqs(data as FAQ[]);
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setQuestion("");
    setAnswer("");
    setShowModal(true);
  }

  function openEdit(faq: FAQ) {
    setEditingId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setQuestion("");
    setAnswer("");
  }

  async function save() {
    if (!question.trim() || !answer.trim()) {
      toast("Question and answer are required", "error");
      return;
    }
    setSaving(true);
    if (editingId) {
      const { error } = await supabase
        .from("faqs")
        .update({ question, answer })
        .eq("id", editingId);
      if (error) { toast("Failed to update FAQ", "error"); setSaving(false); return; }
      toast("FAQ updated!");
    } else {
      const { error } = await supabase
        .from("faqs")
        .insert({
          question,
          answer,
          sort_order: faqs.length,
          is_visible: true,
        });
      if (error) { toast("Failed to add FAQ", "error"); setSaving(false); return; }
      toast("FAQ added!");
    }
    setSaving(false);
    closeModal();
    load();
  }

  async function toggleVisible(faq: FAQ) {
    const { error } = await supabase
      .from("faqs")
      .update({ is_visible: !faq.is_visible })
      .eq("id", faq.id);
    if (error) { toast("Failed to update", "error"); return; }
    setFaqs(faqs.map((f) => (f.id === faq.id ? { ...f, is_visible: !f.is_visible } : f)));
  }

  async function deleteFAQ(faq: FAQ) {
    if (!confirm(`Delete this FAQ?\n\nQ: ${faq.question}`)) return;
    const { error } = await supabase
      .from("faqs")
      .delete()
      .eq("id", faq.id);
    if (error) { toast("Failed to delete", "error"); return; }
    setFaqs(faqs.filter((f) => f.id !== faq.id));
    toast("FAQ deleted");
  }

  async function moveUp(faq: FAQ, index: number) {
    if (index === 0) return;
    const target = faqs[index - 1];
    await Promise.all([
      supabase.from("faqs").update({ sort_order: faq.sort_order }).eq("id", target.id),
      supabase.from("faqs").update({ sort_order: target.sort_order }).eq("id", faq.id),
    ]);
    load();
  }

  async function moveDown(faq: FAQ, index: number) {
    if (index === faqs.length - 1) return;
    const target = faqs[index + 1];
    await Promise.all([
      supabase.from("faqs").update({ sort_order: faq.sort_order }).eq("id", target.id),
      supabase.from("faqs").update({ sort_order: target.sort_order }).eq("id", faq.id),
    ]);
    load();
  }

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <PageHeader
        title="FAQs"
        subtitle="Manage frequently asked questions shown on the public FAQs page"
        actions={
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-full text-[0.85rem] font-medium bg-bright-lavender text-white hover:opacity-90 transition-all"
          >
            + Add FAQ
          </button>
        }
      />

      {loading ? (
        <div className="text-center py-10 text-ink-soft">Loading FAQs...</div>
      ) : faqs.length === 0 ? (
        <div className="bg-white rounded-[20px] p-10 shadow-sm text-center">
          <div className="text-3xl mb-3">❓</div>
          <p className="text-ink-soft text-[0.9rem]">No FAQs yet. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={faq.id}
              className={`bg-white rounded-[16px] p-5 shadow-sm flex items-start gap-4 ${!faq.is_visible ? "opacity-50" : ""}`}
            >
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  onClick={() => moveUp(faq, i)}
                  disabled={i === 0}
                  className="w-7 h-7 rounded-lg bg-ink/5 grid place-items-center text-[0.7rem] hover:bg-ink/10 disabled:opacity-30 transition-colors"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(faq, i)}
                  disabled={i === faqs.length - 1}
                  className="w-7 h-7 rounded-lg bg-ink/5 grid place-items-center text-[0.7rem] hover:bg-ink/10 disabled:opacity-30 transition-colors"
                >
                  ↓
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-display text-[0.95rem] text-ink mb-1">{faq.question}</h3>
                <p className="text-[0.85rem] text-ink-soft leading-relaxed">{faq.answer}</p>
                {!faq.is_visible && (
                  <span className="inline-block mt-2 text-[0.65rem] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    Hidden
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleVisible(faq)}
                  className="w-8 h-8 rounded-lg bg-ink/5 grid place-items-center text-[0.75rem] hover:bg-ink/10 transition-colors"
                  title={faq.is_visible ? "Hide" : "Show"}
                >
                  {faq.is_visible ? "👁" : "🚫"}
                </button>
                <button
                  onClick={() => openEdit(faq)}
                  className="w-8 h-8 rounded-lg bg-sky-blue-light/30 grid place-items-center text-[0.75rem] hover:bg-sky-blue-light/50 transition-colors"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteFAQ(faq)}
                  className="w-8 h-8 rounded-lg bg-red-100 grid place-items-center text-[0.75rem] hover:bg-red-200 transition-colors"
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[2000] bg-ink/50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-white rounded-[20px] p-6 md:p-8 shadow-xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-[1.1rem] mb-4">
              {editingId ? "Edit FAQ" : "Add FAQ"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Question</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. How much is The Slime Studio experience?"
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Answer</label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g. The experience is £15 per slime maker..."
                  rows={4}
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-bright-lavender text-white text-[0.9rem] font-medium disabled:opacity-60 hover:opacity-90 transition-all"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Add FAQ"}
              </button>
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl bg-ink/10 text-ink text-[0.9rem] font-medium hover:bg-ink/15 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
