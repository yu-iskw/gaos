import { PlugsConnected, type Icon } from '@phosphor-icons/react';

export function EmptyState({
  actionLabel,
  description,
  icon: EmptyIcon = PlugsConnected,
  onAction,
  title,
}: {
  actionLabel?: string;
  description: string;
  icon?: Icon;
  onAction?: () => void;
  title: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-kumo-line bg-kumo-base px-6 py-9 text-center">
      <div className="relative mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-kumo-line bg-kumo-elevated text-kumo-subtle">
        <EmptyIcon size={18} />
      </div>
      <p className="m-0 text-[14px] leading-5 font-medium tracking-[-0.3px] text-kumo-default">
        {title}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] leading-[18px] text-kumo-subtle">
        {description}
      </p>
      {actionLabel !== undefined && onAction !== undefined ? (
        <button
          type="button"
          className="relative mx-auto mt-4 rounded-lg bg-kumo-brand px-3 py-1.5 text-sm font-medium text-white"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
