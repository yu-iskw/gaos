import { Link, useRouterState } from '@tanstack/react-router';

import type { ReactNode } from 'react';

export default function SidebarItem({
  collapsed = false,
  icon,
  label,
  matchPrefix = false,
  to,
}: {
  collapsed?: boolean;
  icon: ReactNode;
  label: string;
  matchPrefix?: boolean;
  to: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = matchPrefix ? pathname === to || pathname.startsWith(`${to}/`) : pathname === to;
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={[
        'group relative flex h-11 items-center gap-2.5 rounded-lg px-2.5 text-[14px] leading-5 transition-colors md:h-8 md:text-[13px]',
        isActive
          ? 'bg-kumo-fill font-medium text-kumo-strong'
          : 'font-normal text-kumo-default hover:bg-kumo-tint',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-5 w-5 shrink-0 items-center justify-center',
          isActive ? 'text-kumo-brand' : 'text-kumo-subtle group-hover:text-kumo-default',
        ].join(' ')}
      >
        {icon}
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
    </Link>
  );
}
