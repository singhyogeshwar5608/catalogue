import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 pb-28 pt-16 md:ml-64 md:p-8 md:pb-10 md:pt-3">
        {children}
      </main>
    </div>
  );
}
