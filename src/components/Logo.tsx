export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight ${className}`}>
      <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h3l2-6 4 12 2-6h7" />
        </svg>
      </span>
      OrgPulse
    </span>
  );
}
