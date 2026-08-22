"use client";

import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
      <div>
        <h1 className="font-display text-[1.6rem] md:text-[2rem] text-ink">{title}</h1>
        {subtitle && <p className="text-ink-soft text-[0.9rem] mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
    </div>
  );
}
