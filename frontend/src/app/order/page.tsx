import ProtectedOrderCard from "@/components/ProtectedOrderCard";

export default function OrderPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Protected Swap</h1>
      <ProtectedOrderCard />
    </div>
  );
}
