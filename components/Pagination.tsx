"use client";

// Client-side pager for dashboard lists. Renders nothing for a single page.
export default function Pagination({
  page,
  total,
  pageSize,
  onPage,
  className = "",
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  className?: string;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  // Sliding window of up to 5 page numbers around the current page
  const from = Math.max(1, Math.min(page - 2, pages - 4));
  const to = Math.min(pages, from + 4);
  const nums: number[] = [];
  for (let i = from; i <= to; i++) nums.push(i);

  const btn = "min-w-[36px] h-9 px-2.5 rounded-lg text-[0.82rem] font-medium transition-colors";

  return (
    <div className={`flex items-center justify-between gap-3 flex-wrap mt-4 ${className}`}>
      <p className="text-[0.8rem] text-ink-soft">
        {start}&ndash;{end} of {total}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={`${btn} bg-white border border-ink/10 text-ink hover:bg-ink/5 disabled:opacity-40`}
        >
          &lsaquo;
        </button>
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${btn} ${
              n === page
                ? "bg-sky-blue-light text-ink shadow-sm"
                : "bg-white border border-ink/10 text-ink hover:bg-ink/5"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
          className={`${btn} bg-white border border-ink/10 text-ink hover:bg-ink/5 disabled:opacity-40`}
        >
          &rsaquo;
        </button>
      </div>
    </div>
  );
}
