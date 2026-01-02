import React from "react";

type Props = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  /** For rare screens that need full width (charts/tables). */
  wide?: boolean;
};

export function PageContainer({ title, description, children, right, wide }: Props) {
  return (
    <div className="mx-auto w-full px-4 pb-24 pt-5">
      <div className={wide ? "mx-auto w-full max-w-3xl" : "mx-auto w-full max-w-md"}>
        {(title || right) && (
          <div className="mb-4 flex flex-col gap-3">
            <div className="min-w-0">
              {title && <h1 className="text-[17px] font-semibold tracking-tight">{title}</h1>}
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {right && <div className="shrink-0">{right}</div>}
          </div>
        )}
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
