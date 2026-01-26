import { HeaderNav } from "@/app/_components/vendor-api/header-nav";

export default function BOMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col">
      <HeaderNav />
      <main className="flex-1 overflow-auto p-4">{children}</main>
    </div>
  );
}
