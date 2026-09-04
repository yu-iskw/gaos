import {
  Blueprint,
  BookOpen,
  Compass,
  Hexagon,
  House,
  MagnifyingGlass,
  SidebarSimple,
  SquaresFour,
  Stack,
} from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';

import SiteLogo from '../SiteLogo';

import { openCommandPalette } from './command-palette-bus';
import SidebarItem from './SidebarItem';
import SidebarUtilityStrip from './SidebarUtilityStrip';

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <aside
      aria-label="Primary"
      className={[
        'flex h-full flex-col border-r border-kumo-line bg-kumo-elevated',
        collapsed ? 'w-[56px]' : 'w-[min(320px,100vw)] md:w-[260px]',
        'shrink-0 transition-[width] duration-200 ease-out',
      ].join(' ')}
    >
      <div
        className={[
          'flex h-14 shrink-0 items-center border-b border-kumo-line',
          collapsed ? 'justify-center px-1.5' : 'justify-between gap-2 px-3',
        ].join(' ')}
      >
        <Link to="/" aria-label="gaos" className="flex min-w-0 items-center gap-2">
          <SiteLogo size={20} className="shrink-0">
            <Hexagon size={20} weight="bold" className="shrink-0 text-kumo-brand" />
          </SiteLogo>
          {!collapsed && (
            <span className="truncate text-[14px] font-semibold tracking-[-0.25px] text-kumo-default">
              gaos
            </span>
          )}
        </Link>
        {!collapsed && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Search"
              title="Search (⌘K)"
              className="flex h-7 w-7 items-center justify-center rounded-md text-kumo-inactive hover:bg-kumo-tint"
              onClick={() => {
                openCommandPalette();
              }}
            >
              <MagnifyingGlass size={15} />
            </button>
            <button
              type="button"
              aria-label="Collapse sidebar"
              className="flex h-7 w-7 items-center justify-center rounded-md text-kumo-inactive hover:bg-kumo-tint"
              onClick={onToggleCollapsed}
            >
              <SidebarSimple size={15} />
            </button>
          </div>
        )}
      </div>
      {collapsed ? (
        <button
          type="button"
          aria-label="Expand sidebar"
          className="mx-auto mt-2 flex h-7 w-7 items-center justify-center rounded-md text-kumo-inactive hover:bg-kumo-tint"
          onClick={onToggleCollapsed}
        >
          <SidebarSimple size={15} className="rotate-180" />
        </button>
      ) : null}
      <nav className="flex shrink-0 flex-col gap-0.5 px-2 pt-3">
        <SidebarItem to="/" label="Home" icon={<House size={14} />} collapsed={collapsed} />
        <SidebarItem
          to="/workspaces"
          label="Workspaces"
          icon={<SquaresFour size={14} />}
          collapsed={collapsed}
        />
        <SidebarItem
          to="/blueprints"
          label="Blueprints"
          icon={<Blueprint size={14} />}
          collapsed={collapsed}
        />
        <SidebarItem
          to="/outputs"
          label="Outputs"
          icon={<Stack size={14} />}
          collapsed={collapsed}
        />
        <SidebarItem
          to="/context"
          label="Context"
          icon={<BookOpen size={14} />}
          collapsed={collapsed}
        />
        <SidebarItem
          to="/explore"
          label="Explore"
          icon={<Compass size={14} />}
          collapsed={collapsed}
        />
      </nav>
      <div className="min-h-0 flex-1" />
      <SidebarUtilityStrip />
    </aside>
  );
}
