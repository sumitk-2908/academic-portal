import React from "react";
import { Loader2 } from "lucide-react";

/** 
 * 1. Page Header (New)
 * Enforces the 32px (text-4xl) or 24px (text-3xl) Extrabold rule with tight tracking.
 */
export const PageHeader = ({ title, description }: { title: string, description?: string }) => (
  <div className="mb-8">
    <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-1.5">
      {title}
    </h1>
    {description && (
      <p className="text-base text-muted">
        {description}
      </p>
    )}
  </div>
);

/** 
 * 2. Page Container 
 */
export const PageContainer = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`space-y-8 animate-fade-up ${className}`}>
    {children}
  </div>
);

/** 
 * 3. Section Heading 
 * Enforces the 11px (text-xs) Bold rule with wide tracking (0.06em) for structural labels.
 */
export const SectionHeading = ({ title, action }: { title: string; action?: React.ReactNode; }) => (
  <div className="mb-4 flex items-center justify-between gap-4">
    <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-muted">
      {title}
    </h2>
    {action && <div>{action}</div>}
  </div>
);

export const CardGrid = ({ children, cols = "auto" }: { children: React.ReactNode; cols?: "auto" | "2" | "3" | "4" | "5"; }) => {
  const colClasses = {
    "auto": "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
    "2": "grid grid-cols-1 sm:grid-cols-2 gap-4",
    "3": "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
    "4": "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
    "5": "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4",
  }[cols];
  return <div role="grid" className={colClasses}>{children}</div>;
};

/** 
 * 4. Empty State Wrapper 
 * Enforces the 13px (text-base) Medium rule.
 */
export const EmptyState = ({
  title,
  message,
  icon: Icon,
  action,
}: {
  title?: string;
  message: string;
  icon?: any;
  action?: React.ReactNode;
}) => (
  <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-hover/50 p-12 text-center">
    {Icon && <Icon className="mb-4 h-8 w-8 text-muted opacity-50" />}
    {title && <h3 className="text-lg font-extrabold tracking-tight text-foreground">{title}</h3>}
    <p className={`${title ? "mt-1" : ""} max-w-md text-base font-medium text-muted`}>{message}</p>
    {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{action}</div>}
  </div>
);

export const LoadingGrid = ({ count = 6 }: { count?: number }) => (
  <CardGrid cols="auto">
    {[...Array(count)].map((_, i) => <div key={i} className="h-64 w-full animate-pulse rounded-2xl bg-surface-hover" />)}
  </CardGrid>
);

export const CenteredSpinner = () => (
  <div className="col-span-full flex justify-center py-12">
    <Loader2 className="animate-spin text-primary" size={24} />
  </div>
);
