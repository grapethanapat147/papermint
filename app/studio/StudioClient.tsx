"use client";

import { useMemo, useState, type CSSProperties } from "react";

type ReceiptItem = { id: number; name: string; qty: number; price: number };
type Template = "warm" | "botanical" | "mono";
type ViewMode = "mobile" | "80mm" | "a4";

const currency = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

const templateData: Array<{ id: Template; name: string; detail: string; accent: string }> = [
  { id: "warm", name: "Warm Paper", detail: "อบอุ่น เป็นกันเอง", accent: "#e95f3b" },
  { id: "botanical", name: "Botanical", detail: "สงบ เป็นธรรมชาติ", accent: "#477c69" },
  { id: "mono", name: "Mono Studio", detail: "เรียบ คม มืออาชีพ", accent: "#282b30" },
];

export default function Home() {
  const [merchant, setMerchant] = useState("Mali Studio");
  const [customer, setCustomer] = useState("คุณพิม");
  const [receiptNo, setReceiptNo] = useState("PM-0148");
  const [receiptDate, setReceiptDate] = useState("23 Aug 2026");
  const [address, setAddress] = useState("Bangkok, Thailand");
  const [taxId, setTaxId] = useState("0105568123456");
  const [accent, setAccent] = useState("#e95f3b");
  const [template, setTemplate] = useState<Template>("warm");
  const [viewMode, setViewMode] = useState<ViewMode>("mobile");
  const [documentMode, setDocumentMode] = useState<"receipt" | "sample">("receipt");
  const [items, setItems] = useState<ReceiptItem[]>([
    { id: 1, name: "Handmade ceramic cup", qty: 1, price: 680 },
    { id: 2, name: "Gift wrapping", qty: 1, price: 40 },
  ]);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedReceipts, setSavedReceipts] = useState<string[]>([]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0),
    [items],
  );
  const tax = Math.round(subtotal * 0.07 * 100) / 100;
  const total = subtotal + tax;

  function updateItem(id: number, field: keyof ReceiptItem, value: string) {
    setItems((current) => current.map((item) => item.id === id
      ? { ...item, [field]: field === "name" ? value : Math.max(0, Number(value)) }
      : item));
  }

  function addItem() {
    setItems((current) => [...current, { id: Date.now(), name: "New item", qty: 1, price: 0 }]);
  }

  function finishReceipt() {
    setSavedReceipts((current) => current.includes(receiptNo) ? current : [receiptNo, ...current]);
    setShareOpen(true);
  }

  async function copyLink() {
    const link = `${window.location.origin}/#receipt-${encodeURIComponent(receiptNo)}`;
    await navigator.clipboard?.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function chooseTemplate(next: Template) {
    const selected = templateData.find((entry) => entry.id === next);
    setTemplate(next);
    if (selected) setAccent(selected.accent);
    document.querySelector("#studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="site-shell">
      <header className="topbar" id="top">
        <a className="brand" href="#top" aria-label="Papermint home"><span className="brand-mark">P</span><span>Papermint</span></a>
        <nav aria-label="Main navigation"><a href="#studio">Studio</a><a href="#templates">Templates</a><a href="#how-it-works">How it works</a></nav>
        <a className="ghost-button" href="#drawer">My drawer <span aria-hidden="true">↘</span></a>
      </header>

      <section className="hero">
        <div className="eyebrow"><span /> A receipt can feel like your brand</div>
        <h1>Make every payment<br /><em>feel thoughtfully made.</em></h1>
        <p>สร้างใบเสร็จที่ชัดเจน สวย และมีตัวตนของแบรนด์ พร้อมส่งให้ลูกค้าได้ในไม่กี่นาที</p>
        <a className="hero-cta" href="#studio">Create your first receipt <span>↓</span></a>
      </section>

      <section className="studio" id="studio" aria-label="Receipt studio">
        <aside className="editor-panel">
          <div className="panel-heading">
            <div><span className="step-label">01 / DETAILS</span><h2>Tell us about this sale</h2></div>
            <span className="saved-status">● Draft ready</span>
          </div>

          <div className="mode-switch" aria-label="Document mode">
            <button type="button" className={documentMode === "receipt" ? "active" : ""} onClick={() => setDocumentMode("receipt")}>Receipt</button>
            <button type="button" className={documentMode === "sample" ? "active" : ""} onClick={() => setDocumentMode("sample")}>Design mockup</button>
          </div>

          <div className="form-grid">
            <label className="full-field"><span>Business name</span><input value={merchant} onChange={(event) => setMerchant(event.target.value)} /></label>
            <label><span>Receipt number</span><input value={receiptNo} onChange={(event) => setReceiptNo(event.target.value)} /></label>
            <label><span>Date</span><input value={receiptDate} onChange={(event) => setReceiptDate(event.target.value)} /></label>
            <label className="full-field"><span>Customer</span><input value={customer} onChange={(event) => setCustomer(event.target.value)} /></label>
            <label><span>Business address</span><input value={address} onChange={(event) => setAddress(event.target.value)} /></label>
            <label><span>Tax ID</span><input inputMode="numeric" value={taxId} onChange={(event) => setTaxId(event.target.value)} /></label>
          </div>

          <div className="section-divider"><span>Items</span><span>Qty&nbsp;&nbsp;&nbsp;&nbsp;Price</span></div>
          {items.map((item, index) => (
            <div className="item-edit-row" key={item.id}>
              <span className="item-dot" style={{ background: accent }} />
              <input aria-label={`Item ${index + 1} name`} value={item.name} onChange={(event) => updateItem(item.id, "name", event.target.value)} />
              <input aria-label={`Item ${index + 1} quantity`} inputMode="numeric" value={item.qty} onChange={(event) => updateItem(item.id, "qty", event.target.value)} />
              <input aria-label={`Item ${index + 1} price`} inputMode="decimal" value={item.price} onChange={(event) => updateItem(item.id, "price", event.target.value)} />
              <button type="button" aria-label={`Remove ${item.name}`} disabled={items.length === 1} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>×</button>
            </div>
          ))}
          <button className="add-item" type="button" onClick={addItem}><span>+</span> Add another item</button>

          <div className="style-picker">
            <div><span>Receipt character</span><strong>{templateData.find((entry) => entry.id === template)?.name}</strong></div>
            <div className="swatches" aria-label="Choose accent color">
              {["#e95f3b", "#477c69", "#d5a33f", "#282b30"].map((color) => (
                <button key={color} type="button" aria-label={`Use ${color}`} className={accent === color ? "active" : ""} style={{ backgroundColor: color }} onClick={() => setAccent(color)} />
              ))}
            </div>
          </div>
        </aside>

        <div className="preview-panel">
          <div className="preview-toolbar">
            <span>LIVE PREVIEW</span>
            <div>{(["mobile", "80mm", "a4"] as ViewMode[]).map((mode) => <button key={mode} type="button" className={viewMode === mode ? "active" : ""} onClick={() => setViewMode(mode)}>{mode === "mobile" ? "Mobile" : mode.toUpperCase()}</button>)}</div>
          </div>
          <div className="paper-stage">
            <span className="flower flower-one">✿</span><span className="flower flower-two">✦</span>
            <article className={`receipt template-${template} size-${viewMode}`} style={{ "--receipt-accent": accent } as CSSProperties}>
              {documentMode === "sample" && <span className="sample-watermark">SAMPLE / ตัวอย่าง</span>}
              <div className="receipt-topline"><span>{documentMode === "receipt" ? "RECEIPT" : "DESIGN MOCKUP"}</span><span>#{receiptNo || "—"}</span></div>
              <div className="receipt-logo">{merchant.slice(0, 1) || "P"}</div>
              <h3>{merchant || "Your studio"}</h3>
              <p className="receipt-note">Made with care, packed with a little joy.</p>
              <p className="receipt-business">{address || "Business address"} · TAX ID {taxId || "—"}</p>
              <div className="receipt-meta"><span>{receiptDate.toUpperCase() || "DATE"}</span><span>FOR {customer.toUpperCase() || "OUR CUSTOMER"}</span></div>
              <div className="receipt-items">{items.map((item) => <div key={item.id}><span>{item.qty || 0} × {item.name || "Untitled item"}</span><span>{currency.format((item.qty || 0) * (item.price || 0))}</span></div>)}</div>
              <div className="receipt-summary"><div><span>SUBTOTAL</span><span>{currency.format(subtotal)}</span></div><div><span>VAT 7%</span><span>{currency.format(tax)}</span></div></div>
              <div className="receipt-total"><span>TOTAL PAID</span><strong>{currency.format(total)}</strong></div>
              <div className="receipt-thanks"><span className="stamp">PAID<br />WITH<br />THANKS</span><p>ขอบคุณที่สนับสนุน<br />ธุรกิจเล็ก ๆ ของเรา</p></div>
              <div className="barcode" aria-hidden="true" /><small>papermint.app/r/{receiptNo || "draft"}</small>
            </article>
          </div>
          <button className="primary-button" type="button" onClick={finishReceipt}>Finish &amp; share receipt <span>→</span></button>
          <p className="studio-note">Papermint รุ่นต้นแบบนี้ไม่ใช่ระบบ e-Tax Invoice และยังไม่ส่งข้อมูลให้กรมสรรพากร</p>
        </div>
      </section>

      <section className="template-section" id="templates">
        <div className="section-copy"><span className="step-label">02 / CHARACTER</span><h2>Beautiful by default.<br /><em>Still unmistakably yours.</em></h2><p>เลือกบุคลิกที่เข้ากับแบรนด์ แล้วปรับสีและรายละเอียดได้โดยไม่ต้องเริ่มจากหน้ากระดาษเปล่า</p></div>
        <div className="template-grid">
          {templateData.map((entry) => (
            <button className={`template-card ${template === entry.id ? "selected" : ""}`} type="button" key={entry.id} onClick={() => chooseTemplate(entry.id)}>
              <span className={`mini-paper mini-${entry.id}`}><i style={{ background: entry.accent }} /><b>{entry.name}</b><small>RECEIPT · 0148</small><span /><span /><span /></span>
              <strong>{entry.name}</strong><small>{entry.detail}</small><em>{template === entry.id ? "Selected" : "Use template"} →</em>
            </button>
          ))}
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="how-intro"><span className="step-label">03 / HOW IT WORKS</span><h2>From payment to<br /><em>paper feeling.</em></h2></div>
        <div className="how-steps">
          <article><span>1</span><h3>Add the truth</h3><p>ใส่ข้อมูลร้าน ลูกค้า รายการ และยอดเงินที่ถูกต้อง</p></article>
          <article><span>2</span><h3>Give it character</h3><p>เลือก template สี และข้อความขอบคุณที่เป็นแบรนด์คุณ</p></article>
          <article><span>3</span><h3>Share with confidence</h3><p>พิมพ์หรือบันทึกเป็น PDF พร้อมส่งให้ลูกค้าได้ทันที</p></article>
        </div>
      </section>

      <section className="drawer-section" id="drawer">
        <div><span className="step-label">MY DRAWER / THIS SESSION</span><h2>Receipts worth keeping.</h2><p>ใบเสร็จที่กด Finish จะอยู่ใน drawer นี้ระหว่างการใช้งานรอบปัจจุบัน</p></div>
        <div className="drawer-box">
          {savedReceipts.length === 0 ? <p><span>↳</span> Your finished receipts will land here.</p> : savedReceipts.map((number) => <article key={number}><span className="drawer-receipt">{merchant.slice(0, 1) || "P"}</span><div><strong>Receipt #{number}</strong><small>{merchant} · {currency.format(total)}</small></div><span className="paid-pill">PAID</span></article>)}
        </div>
      </section>

      <section className="trust-strip"><span className="trust-mark">✓</span><div><strong>Designed for trust, not fake receipts.</strong><p>Mockup ทุกใบมีลายน้ำ และเอกสารที่ออกจริงควรมีข้อมูลธุรกิจครบถ้วน ก่อนพัฒนาเป็นผลิตภัณฑ์จริงควรตรวจสอบข้อกำหนดใบรับและ e-Tax กับผู้เชี่ยวชาญ</p></div></section>

      <footer><a className="brand" href="#top"><span className="brand-mark">P</span><span>Papermint</span></a><p>Receipts, thoughtfully made.</p><a href="#studio">Create a receipt ↑</a></footer>

      {shareOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShareOpen(false); }}>
          <section className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
            <button className="modal-close" type="button" aria-label="Close" onClick={() => setShareOpen(false)}>×</button>
            <span className="share-check">✓</span><span className="step-label">RECEIPT READY</span>
            <h2 id="share-title">Made to be remembered.</h2><p>Receipt #{receiptNo} ถูกเก็บไว้ใน drawer ของรอบนี้แล้ว เลือกวิธีส่งต่อได้เลย</p>
            <div className="share-link"><span>{typeof window === "undefined" ? "papermint.app" : window.location.host}/r/{receiptNo}</span><button type="button" onClick={copyLink}>{copied ? "Copied!" : "Copy link"}</button></div>
            <div className="share-actions"><button type="button" onClick={() => window.print()}>Print / Save PDF</button><button type="button" onClick={() => setShareOpen(false)}>Keep editing</button></div>
            <small>ลิงก์ตรวจสอบและการเก็บข้อมูลถาวรจะเปิดใช้งานเมื่อเชื่อมระบบหลังบ้าน</small>
          </section>
        </div>
      )}
    </main>
  );
}
