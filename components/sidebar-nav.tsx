"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string };

export function SidebarNav({ items }: { items: Item[] }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar-group" aria-label="Điều hướng bảng điều khiển">
      <span>Nghiệp vụ</span>
      {items.map((item) => {
        const active =
          item.href === pathname ||
          (item.href !== "/quan-tri" &&
            item.href !== "/nhan-vien" &&
            item.href !== "/ke-toan" &&
            pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "active" : undefined}
          >
            <span className="ico" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
