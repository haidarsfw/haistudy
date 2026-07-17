"use client";

/**
 * A titled group of fields.
 *
 * The identity step had every field and every radio option carrying its own
 * border — twelve boxes on one screen, none of them saying which belonged with
 * which. The boxes are now at the level that means something: "Data kamu" and
 * "Cara masuk". Inside a section the fields are plain, so the only borders left
 * are the ones a buyer can act on (the inputs) plus the two groups.
 */
export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  /** Top-right slot — the review's "Edit" link. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-sm font-bold text-foreground">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
