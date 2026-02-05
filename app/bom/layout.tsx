import { HeaderNav } from "@/app/_components/vendor-api/header-nav";

export default function BOMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col">
      <HeaderNav />
      <main className="flex-1 min-h-0 overflow-auto px-5 pt-2 pb-5">{children}</main>
    </div>
  );
}
