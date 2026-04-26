import SessionStatusCard from "@/components/SessionStatusCard";
import GeckoChart from "@/components/GeckoChart";

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold">Institutional Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <GeckoChart />
        </div>
        <div className="lg:col-span-1">
          <SessionStatusCard />
        </div>
      </div>
    </div>
  );
}
