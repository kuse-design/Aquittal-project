import { useState } from "react";
import { ArrowUpRight, ClipboardList, Mail, Phone, RefreshCw, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { OrderStatus } from "@shared/store";

const statusLabels: Record<OrderStatus, string> = {
  new: "New request",
  contacted: "Customer contacted",
  confirmed: "Confirmed",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

function formatMoney(value: string, currencyCode: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(Number(value));
  } catch {
    return `${currencyCode} ${value}`;
  }
}

export default function AdminOrders() {
  const utils = trpc.useUtils();
  const { data: orders, isLoading, error } = trpc.admin.orders.list.useQuery(undefined, { retry: false });
  const [savingId, setSavingId] = useState<number | null>(null);
  const updateStatus = trpc.admin.orders.updateStatus.useMutation();

  async function changeStatus(id: number, status: OrderStatus) {
    setSavingId(id);
    try {
      await updateStatus.mutateAsync({ id, status });
      await utils.admin.orders.list.invalidate();
      toast.success("Order status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this order.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div><p className="eyebrow">ACQUITTAL · STUDIO</p><h1>Order requests <span>({orders?.length ?? 0})</span></h1><p>Contact customers, confirm details, and update each request as you fulfil it.</p></div>
        <Button variant="outline" onClick={() => void utils.admin.orders.list.invalidate()} disabled={isLoading}><RefreshCw size={15} /> Refresh</Button>
      </div>

      <div className="admin-order-note"><ShoppingBag size={17} /><p><strong>Manual orders only.</strong> No payment is collected on the website. Contact the customer to confirm availability, delivery, and payment arrangements.</p></div>

      {isLoading ? <div className="admin-empty-state">Loading order requests…</div> : error ? (
        <div className="admin-empty-state admin-error-state"><h3>Could not load order requests</h3><p>{error.message}</p><Button variant="outline" onClick={() => void utils.admin.orders.list.invalidate()}>Try again</Button></div>
      ) : !orders?.length ? (
        <div className="admin-empty-state"><span className="admin-empty-mark"><ClipboardList size={23} /></span><h3>Your order inbox is clear.</h3><p>New customer order requests will appear here with their chosen sizes, colours, and contact details.</p></div>
      ) : (
        <div className="admin-orders-list">{orders.map(order => (
          <article className="admin-order-card" key={order.id}>
            <div className="admin-order-header">
              <div><p className="eyebrow">{order.orderNumber}</p><h2>{order.customerName}</h2><time dateTime={new Date(order.createdAt).toISOString()}>{new Date(order.createdAt).toLocaleString()}</time></div>
              <label className="admin-status-select-label">Order status<select className={`admin-status-select status-${order.status}`} value={order.status} disabled={savingId === order.id} onChange={event => void changeStatus(order.id, event.target.value as OrderStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
            <div className="admin-order-contact">
              <a href={`tel:${order.customerPhone}`}><Phone size={14} />{order.customerPhone}<ArrowUpRight size={12} /></a>
              {order.customerEmail && <a href={`mailto:${order.customerEmail}`}><Mail size={14} />{order.customerEmail}<ArrowUpRight size={12} /></a>}
            </div>
            <div className="admin-order-items">{order.items.map(item => (
              <div className="admin-order-line" key={item.id}><div><strong>{item.productTitle}</strong><span>{item.variantLabel} · Qty {item.quantity}</span></div><span>{formatMoney(item.lineTotal, order.currencyCode)}</span></div>
            ))}</div>
            {order.customerNote && <div className="admin-customer-note"><span>CUSTOMER NOTE</span><p>{order.customerNote}</p></div>}
            <div className="admin-order-total"><span>Order estimate</span><strong>{formatMoney(order.total, order.currencyCode)}</strong><small>Confirm final delivery charges and payment directly with the customer.</small></div>
          </article>
        ))}</div>
      )}
    </div>
  );
}
