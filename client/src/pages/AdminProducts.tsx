import { useState } from "react";
import { Boxes, Eye, EyeOff, ImagePlus, PackageCheck, Pencil, Plus, Tag, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { optimizeProductImage } from "@/lib/imageOptimization";
import { trpc } from "@/lib/trpc";
import type { ProductInput, StoreProduct } from "@shared/store";

const blankProduct = (): ProductInput => ({
  title: "",
  description: "",
  category: "Clothing",
  price: "",
  promoPrice: null,
  currencyCode: "USD",
  stockStatus: "in_stock",
  isPublished: true,
  sizes: [],
  colors: [],
  images: [],
});

function formatMoney(value: string, currencyCode: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(Number(value));
  } catch {
    return `${currencyCode} ${value}`;
  }
}

function splitOptions(value: string) {
  return Array.from(new Set(value.split(",").map(item => item.trim()).filter(Boolean)));
}

export default function AdminProducts() {
  const utils = trpc.useUtils();
  const { data: products, isLoading, error } = trpc.admin.products.list.useQuery(undefined, { retry: false });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<ProductInput>(blankProduct());
  const [sizeText, setSizeText] = useState("");
  const [colorText, setColorText] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const uploadImage = trpc.admin.uploadImage.useMutation();
  const createProduct = trpc.admin.products.create.useMutation();
  const updateProduct = trpc.admin.products.update.useMutation();
  const deleteProduct = trpc.admin.products.delete.useMutation();

  async function refresh() {
    await Promise.all([utils.admin.products.list.invalidate(), utils.storefront.products.list.invalidate()]);
  }

  function startCreate() {
    setEditingId(null);
    setForm(blankProduct());
    setSizeText("");
    setColorText("");
    setEditorOpen(true);
  }

  function startEdit(product: StoreProduct) {
    setEditingId(product.id);
    setForm({
      title: product.title,
      description: product.description,
      category: product.category,
      price: product.price,
      promoPrice: product.promoPrice,
      currencyCode: product.currencyCode,
      stockStatus: product.stockStatus,
      isPublished: product.isPublished,
      sizes: product.sizes,
      colors: product.colors,
      images: product.images.map(image => ({ url: image.url, storageKey: image.storageKey, altText: image.altText, position: image.position })),
    });
    setSizeText(product.sizes.join(", "));
    setColorText(product.colors.join(", "));
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingId(null);
  }

  async function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (form.images.length + files.length > 8) {
      toast.error("A product can have up to 8 photos.");
      return;
    }
    setUploading(true);
    try {
      const uploaded: ProductInput["images"] = [];
      for (const file of files) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          throw new Error(`${file.name}: use a JPEG, PNG, or WebP image.`);
        }
        if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name}: the maximum image size is 5 MB.`);
        const result = await uploadImage.mutateAsync(await optimizeProductImage(file));
        uploaded.push({ ...result, position: form.images.length + uploaded.length });
      }
      setForm(current => ({ ...current, images: [...current.images, ...uploaded] }));
      toast.success(`${uploaded.length} photo${uploaded.length === 1 ? "" : "s"} uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The image could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.promoPrice && Number(form.promoPrice) >= Number(form.price)) {
      toast.error("Promo price must be lower than the regular price.");
      return;
    }
    const payload: ProductInput = { ...form, sizes: splitOptions(sizeText), colors: splitOptions(colorText) };
    try {
      if (editingId) await updateProduct.mutateAsync({ id: editingId, product: payload });
      else await createProduct.mutateAsync(payload);
      await refresh();
      toast.success(editingId ? "Product updated" : "Product added to your catalog");
      closeEditor();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The product could not be saved.");
    }
  }

  async function handleDelete(product: StoreProduct) {
    if (!window.confirm(`Delete “${product.title}”? Past customer order records will be kept.`)) return;
    try {
      await deleteProduct.mutateAsync({ id: product.id });
      await refresh();
      toast.success("Product deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The product could not be deleted.");
    }
  }

  const visibleProducts = (products ?? []).filter(product =>
    `${product.title} ${product.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  const inStockCount = (products ?? []).filter(product => product.stockStatus === "in_stock").length;
  const promoCount = (products ?? []).filter(product => Boolean(product.promoPrice)).length;

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div><p className="eyebrow">ACQUITTAL · STUDIO</p><h1>Products <span>({products?.length ?? 0})</span></h1><p>Keep the collection, prices, and availability up to date.</p></div>
        <Button onClick={startCreate} className="admin-primary-button"><Plus size={16} /> Add a product</Button>
      </div>

      <div className="admin-stats-grid">
        <article className="admin-stat-card"><span className="admin-stat-icon"><Boxes size={18} /></span><div><span>CATALOG</span><strong>{products?.length ?? 0}</strong><small>Total listed pieces</small></div></article>
        <article className="admin-stat-card"><span className="admin-stat-icon"><PackageCheck size={18} /></span><div><span>IN STOCK</span><strong>{inStockCount}</strong><small>Available to request</small></div></article>
        <article className="admin-stat-card"><span className="admin-stat-icon"><Tag size={18} /></span><div><span>ON PROMO</span><strong>{promoCount}</strong><small>Showing a sale price</small></div></article>
      </div>

      {editorOpen && (
        <section className="admin-editor-panel" aria-labelledby="product-editor-title">
          <div className="admin-editor-heading"><div><p className="eyebrow">{editingId ? "EDIT COLLECTION" : "NEW ARRIVAL"}</p><h2 id="product-editor-title">{editingId ? "Edit product" : "Add a product"}</h2></div><button type="button" className="admin-icon-button" onClick={closeEditor} aria-label="Close editor"><X size={18} /></button></div>
          <form onSubmit={handleSave} className="admin-product-form">
            <div className="admin-form-grid">
              <label className="admin-label">Product name<input className="admin-input" value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} required minLength={2} maxLength={180} placeholder="e.g. The Everyday Shirt" /></label>
              <label className="admin-label">Category<input className="admin-input" value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))} maxLength={100} placeholder="Shirts, outerwear, accessories…" /></label>
              <label className="admin-label">Regular price<input className="admin-input" type="number" min="0.01" step="0.01" value={form.price} onChange={event => setForm(current => ({ ...current, price: event.target.value }))} required placeholder="0.00" /></label>
              <label className="admin-label">Promo price <span>(optional)</span><input className="admin-input" type="number" min="0.01" step="0.01" value={form.promoPrice ?? ""} onChange={event => setForm(current => ({ ...current, promoPrice: event.target.value || null }))} placeholder="Leave empty for no promotion" /></label>
              <label className="admin-label">Currency<select className="admin-input" value={form.currencyCode} onChange={event => setForm(current => ({ ...current, currencyCode: event.target.value }))}><option value="USD">USD — US Dollar</option><option value="NGN">NGN — Nigerian Naira</option><option value="GHS">GHS — Ghanaian Cedi</option><option value="GBP">GBP — British Pound</option><option value="EUR">EUR — Euro</option><option value="CAD">CAD — Canadian Dollar</option><option value="AUD">AUD — Australian Dollar</option></select></label>
              <label className="admin-label">Stock status<select className="admin-input" value={form.stockStatus} onChange={event => setForm(current => ({ ...current, stockStatus: event.target.value as ProductInput["stockStatus"] }))}><option value="in_stock">In stock</option><option value="out_of_stock">Out of stock</option></select></label>
              <label className="admin-label admin-form-wide">Description<textarea className="admin-input admin-textarea" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} maxLength={5000} rows={4} placeholder="Fabric, fit, care, and what makes this piece special…" /></label>
              <label className="admin-label">Sizes <span>(comma separated)</span><input className="admin-input" value={sizeText} onChange={event => setSizeText(event.target.value)} placeholder="XS, S, M, L, XL" /></label>
              <label className="admin-label">Colours <span>(comma separated)</span><input className="admin-input" value={colorText} onChange={event => setColorText(event.target.value)} placeholder="Black, Cream, Olive" /></label>
            </div>

            <div className="admin-upload-row">
              <div><p className="admin-label-title">Product photos</p><p className="admin-help">Auto-optimized WebP · 1,600 px max edge · 5 MB source limit</p></div>
              <label className={`admin-upload-button ${uploading ? "is-uploading" : ""}`}><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageSelection} disabled={uploading || form.images.length >= 8} /><ImagePlus size={16} />{uploading ? "Optimizing…" : "Choose photos"}</label>
            </div>
            {form.images.length > 0 && <div className="admin-image-grid">{form.images.map((image, index) => <div className="admin-image-preview" key={image.storageKey}><img src={image.url} alt={image.altText || `Product photo ${index + 1}`} loading="lazy" decoding="async" /><button type="button" onClick={() => setForm(current => ({ ...current, images: current.images.filter((_, imageIndex) => imageIndex !== index).map((item, position) => ({ ...item, position })) }))} aria-label={`Remove photo ${index + 1}`}><X size={14} /></button></div>)}</div>}

            <label className="admin-publish-toggle"><input type="checkbox" checked={form.isPublished} onChange={event => setForm(current => ({ ...current, isPublished: event.target.checked }))} /><span><strong>Show this product on the storefront</strong><small>Turn off to keep it as a private draft.</small></span></label>
            <div className="admin-form-actions"><Button type="button" variant="outline" onClick={closeEditor}>Cancel</Button><Button type="submit" className="admin-primary-button" disabled={uploading || createProduct.isPending || updateProduct.isPending}>{createProduct.isPending || updateProduct.isPending ? "Saving…" : editingId ? "Save changes" : "Add product"}</Button></div>
          </form>
        </section>
      )}

      <section className="admin-list-section">
        <div className="admin-list-heading"><div><p className="eyebrow">YOUR COLLECTION</p><h2>All products</h2></div><input className="admin-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search products" aria-label="Search products" /></div>
        {isLoading ? <div className="admin-empty-state">Loading your catalog…</div> : error ? <div className="admin-empty-state admin-error-state"><h3>Could not load products</h3><p>{error.message}</p><Button variant="outline" onClick={() => void utils.admin.products.list.invalidate()}>Try again</Button></div> : visibleProducts.length === 0 ? (
          <div className="admin-empty-state"><span className="admin-empty-mark"><Boxes size={23} /></span><h3>{search ? "No matching products" : "Your first piece goes here."}</h3><p>{search ? "Try another product name or category." : "Add the first item, upload its photos, and set a price and availability."}</p>{!search && <Button onClick={startCreate} className="admin-primary-button"><Plus size={16} /> Add a product</Button>}</div>
        ) : (
          <div className="admin-product-list">{visibleProducts.map(product => (
            <article className="admin-product-row" key={product.id}>
              <div className="admin-product-image">{product.images[0]?.url ? <img src={product.images[0].url} alt={product.images[0].altText || product.title} loading="lazy" decoding="async" /> : <ImagePlus size={20} />}</div>
              <div className="admin-product-main"><div className="admin-product-title-line"><h3>{product.title}</h3>{product.isPublished ? <span className="admin-status-badge status-live"><Eye size={12} />Live</span> : <span className="admin-status-badge status-draft"><EyeOff size={12} />Draft</span>}</div><p>{product.category || "Clothing"}{product.sizes.length ? ` · ${product.sizes.join(", ")}` : ""}{product.colors.length ? ` · ${product.colors.join(", ")}` : ""}</p></div>
              <div className="admin-product-price">{product.promoPrice ? <><span className="admin-old-price">{formatMoney(product.price, product.currencyCode)}</span><strong>{formatMoney(product.promoPrice, product.currencyCode)}</strong></> : <strong>{formatMoney(product.price, product.currencyCode)}</strong>}</div>
              <span className={`admin-stock-badge ${product.stockStatus === "in_stock" ? "stock-in" : "stock-out"}`}>{product.stockStatus === "in_stock" ? "In stock" : "Out of stock"}</span>
              <div className="admin-row-actions"><Button type="button" variant="outline" size="sm" onClick={() => startEdit(product)}><Pencil size={14} /> Edit</Button><Button type="button" variant="outline" size="icon" onClick={() => void handleDelete(product)} aria-label={`Delete ${product.title}`}><Trash2 size={14} /></Button></div>
            </article>
          ))}</div>
        )}
      </section>
      <p className="admin-footnote"><Upload size={13} /> Product images are stored securely. Removing a photo detaches it from the product; past order details remain in the order inbox.</p>
    </div>
  );
}
