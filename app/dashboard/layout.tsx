import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-w-0 bg-gray-50">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-28 pt-[max(5.25rem,env(safe-area-inset-top,0px)+4.25rem)] md:ml-64 md:p-8 md:pb-10 md:pt-3">
        {children}
      </main>
    </div>
  );
}
