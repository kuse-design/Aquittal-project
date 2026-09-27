import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Link } from "wouter";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <main className="admin-access-screen">
        <div className="admin-access-card">
          <span className="admin-access-icon"><LockKeyhole size={22} /></span>
          <p className="eyebrow">ACQUITTAL · STUDIO</p>
          <h1>Sign in to manage the store.</h1>
          <p>Product edits and customer order requests are visible only to the store owner.</p>
          <Button onClick={() => startLogin()} className="admin-access-button">Sign in securely</Button>
          <Link href="/" className="admin-back-link"><ArrowLeft size={15} /> Back to the storefront</Link>
        </div>
      </main>
    );
  }

  if (user.role !== "admin") {
    return (
      <main className="admin-access-screen">
        <div className="admin-access-card">
          <span className="admin-access-icon"><LockKeyhole size={22} /></span>
          <p className="eyebrow">PRIVATE AREA</p>
          <h1>Studio access is restricted.</h1>
          <p>This signed-in account does not have store-owner permissions.</p>
          <Link href="/" className="admin-back-link"><ArrowLeft size={15} /> Back to the storefront</Link>
        </div>
      </main>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
