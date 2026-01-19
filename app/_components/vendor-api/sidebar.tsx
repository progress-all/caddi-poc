"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/_lib/utils";

interface SidebarItem {
  href: string;
  label: string;
  disabled?: boolean;
}

const sidebarItems: SidebarItem[] = [
  {
    href: "/vendor/mouser",
    label: "Mouser",
  },
  {
    href: "/vendor/digikey",
    label: "Digi-Key",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-card">
      <div className="p-4">
        <h2 className="mb-4 text-lg font-semibold">Vendor APIs</h2>
        <nav className="space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                item.disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
