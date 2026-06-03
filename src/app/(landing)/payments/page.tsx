import type { Metadata } from "next";
import { PaymentsFlow } from "@/components/payments/payments-flow";

export const metadata: Metadata = {
  title: "Beli Akses",
  description:
    "Beli license key haistudy. Pilih paket, bayar, unggah bukti, dan akses materi, quiz, AI, dan komunitas belajar.",
  alternates: { canonical: "/payments" },
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ pkg?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen bg-background">
      <PaymentsFlow initialPkg={params.pkg} />
    </div>
  );
}
