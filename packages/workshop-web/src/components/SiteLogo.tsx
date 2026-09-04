import type { ReactNode } from 'react';

export default function SiteLogo({
  children,
  className,
  size,
}: {
  children: ReactNode;
  className?: string;
  size: number;
}) {
  return (
    <span className={className} style={{ width: size, height: size }}>
      {children}
    </span>
  );
}
