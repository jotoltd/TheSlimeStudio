import { readFileSync, writeFileSync } from "fs";

const path = "/Users/ratemyplate/Documents/SlimeStudio/web/app/dashboard/gift-cards/page.tsx";
let src = readFileSync(path, "utf8");

function rep(oldStr, newStr) {
  if (!src.includes(oldStr)) {
    console.error("NOT FOUND:\n" + oldStr.slice(0, 120));
    process.exit(1);
  }
  src = src.replace(oldStr, newStr);
}

// 1. Extend loadRedemptions + add saveExpiry/openBulkExpiry/applyBulkExpiry
rep(
`  async function loadRedemptions(card: GiftCard) {
    setSelected(card);
    setRedemptions([]);
    setLoadingRedemptions(true);
    try {
      const res = await fetch(\`/api/admin/gift-cards/redemptions?card_id=\${card.id}\`);
      const data = await res.json();
      setRedemptions(data.redemptions || []);
    } catch {}
    setLoadingRedemptions(false);
  }`,
`  async function loadRedemptions(card: GiftCard) {
    setSelected(card);
    setRedemptions([]);
    setLoadingRedemptions(true);
    setExpiryDraft(card.expiry_date ? card.expiry_date.split("T")[0] : "");
    setExpiryMsg(null);
    try {
      const res = await fetch(\`/api/admin/gift-cards/redemptions?card_id=\${card.id}\`);
      const data = await res.json();
      setRedemptions(data.redemptions || []);
    } catch {}
    setLoadingRedemptions(false);
  }

  async function saveExpiry() {
    if (!selected) return;
    setExpirySaving(true);
    setExpiryMsg(null);
    try {
      const expiry_date = expiryDraft ? new Date(expiryDraft + "T23:59:59").toISOString() : null;
      const res = await fetch("/api/admin/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_expiry", id: selected.id, data: { expiry_date } }),
      });
      const data = await res.json();
      if (data.error) {
        setExpiryMsg({ type: "err", text: data.error });
      } else {
        setSelected({ ...selected, expiry_date });
        setExpiryMsg({ type: "ok", text: expiry_date ? "Expiry updated." : "Expiry removed — card never expires." });
        load();
      }
    } catch {
      setExpiryMsg({ type: "err", text: "Network error. Please try again." });
    }
    setExpirySaving(false);
  }

  function openBulkExpiry() {
    setBulkExpiryDate("");
    setBulkExpiryNever(false);
    setBulkResult(null);
    setShowBulkExpiry(true);
  }

  async function applyBulkExpiry() {
    setBulkSaving(true);
    setBulkResult(null);
    const expiry_date = bulkExpiryNever
      ? null
      : bulkExpiryDate
        ? new Date(bulkExpiryDate + "T23:59:59").toISOString()
        : null;
    try {
      const res = await fetch("/api/admin/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_expiry", data: { expiry_date } }),
      });
      const data = await res.json();
      if (data.error) {
        setBulkResult({ type: "err", text: data.error });
      } else {
        const n = data.count || 0;
        const extra = data.reactivated ? `, ${data.reactivated} reactivated` : "";
        setBulkResult({
          type: "ok",
          text: expiry_date
            ? `Done — ${n} card${n === 1 ? "" : "s"} now expire ${new Date(expiry_date).toLocaleDateString("en-GB")}${extra}.`
            : `Done — ${n} card${n === 1 ? "" : "s"} now never expire${extra}.`,
        });
        load();
      }
    } catch {
      setBulkResult({ type: "err", text: "Network error. Please try again." });
    }
    setBulkSaving(false);
  }`
);

// 2. PageHeader actions — add "Extend all…" button
rep(
`      <PageHeader
        title="Gift Cards"
        subtitle="Manage gift cards, view balances, and track redemptions"
        actions={
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary text-[0.85rem]"
          >
            + New Gift Card
          </button>
        }
      />`,
`      <PageHeader
        title="Gift Cards"
        subtitle="Manage gift cards, view balances, and track redemptions"
        actions={
          <div className="flex gap-2">
            <button
              onClick={openBulkExpiry}
              className="px-5 py-2.5 rounded-full bg-ink/5 text-ink text-[0.85rem] font-medium hover:bg-ink/10"
            >
              Extend all…
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="btn-primary text-[0.85rem]"
            >
              + New Gift Card
            </button>
          </div>
        }
      />`
);

// 3. Expiry editor inside the redemption-history modal (after status row block)
rep(
`            <div className="border-t border-ink/10 pt-4">
              <h3 className="font-display text-[0.9rem] text-ink mb-3">Redemptions</h3>`,
`            <div className="border-t border-ink/10 pt-4 mb-4">
              <h3 className="font-display text-[0.9rem] text-ink mb-3">Expiry Date</h3>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={expiryDraft}
                  onChange={(e) => setExpiryDraft(e.target.value)}
                  className="px-3 py-2 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
                <button
                  onClick={saveExpiry}
                  disabled={expirySaving}
                  className="btn-primary text-[0.8rem] disabled:opacity-60 whitespace-nowrap"
                >
                  {expirySaving ? "Saving..." : "Save"}
                </button>
              </div>
              <p className="text-[0.75rem] text-ink-soft mt-1.5">
                {selected.expiry_date
                  ? `Currently expires ${new Date(selected.expiry_date).toLocaleDateString("en-GB")}.`
                  : "No expiry set."}{" "}
                Clear the date and save to remove expiry entirely.
              </p>
              {expiryMsg && (
                <p className={`text-[0.8rem] mt-2 ${expiryMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>{expiryMsg.text}</p>
              )}
            </div>

            <div className="border-t border-ink/10 pt-4">
              <h3 className="font-display text-[0.9rem] text-ink mb-3">Redemptions</h3>`
);

// 4. Bulk expiry modal before closing tag
rep(
`    </div>
  );
}`,
`      {showBulkExpiry && (
        <div
          className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
          onClick={() => setShowBulkExpiry(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl text-ink mb-1">Extend all gift cards</h2>
            <p className="text-sm text-ink-soft mb-4">
              Sets the expiry on every card with a remaining balance. Cards marked
              &quot;Expired&quot; are reactivated. Fully used and cancelled cards are untouched.
            </p>
            <label className="block text-sm font-medium mb-1.5">New expiry date</label>
            <input
              type="date"
              value={bulkExpiryDate}
              disabled={bulkExpiryNever}
              onChange={(e) => setBulkExpiryDate(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light disabled:opacity-50"
            />
            <label className="flex items-center gap-2 mt-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={bulkExpiryNever}
                onChange={(e) => setBulkExpiryNever(e.target.checked)}
                className="w-4 h-4 accent-pink-500"
              />
              Never expire
            </label>
            {bulkResult && (
              <p className={`text-sm mt-3 ${bulkResult.type === "ok" ? "text-green-600" : "text-red-600"}`}>{bulkResult.text}</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={applyBulkExpiry}
                disabled={bulkSaving || (!bulkExpiryNever && !bulkExpiryDate)}
                className="btn-primary text-[0.85rem] disabled:opacity-60"
              >
                {bulkSaving ? "Applying..." : "Apply to all cards"}
              </button>
              <button
                onClick={() => setShowBulkExpiry(false)}
                className="px-5 py-2.5 rounded-full bg-ink/5 text-ink text-[0.85rem] font-medium hover:bg-ink/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`
);

writeFileSync(path, src);
console.log("patched OK");
