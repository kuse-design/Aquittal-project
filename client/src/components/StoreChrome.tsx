import { useState } from "react";
import { ArrowRight, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const brandLogo = "/logo.jpeg";

const navLinks = [
  { href: "/#collection", label: "Shop the edit" },
  { href: "/#story", label: "Our point of view" },
  { href: "/#details", label: "How ordering works" },
];

export function StoreHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { openCart, itemCount } = useCart();

  return (
    <>
      <div className="announcement-bar">
        <span>THE FIRST EDIT</span>
        <span className="announcement-dot" />
        <span>NEW SEASON 2026</span>
        <a href="/#collection">
          Shop the collection <ArrowRight size={14} />
        </a>
      </div>
      <header className="site-header">
        <a className="brand-wordmark" href="/#top" aria-label="Acquittal Luxury Apparel home">
          <img className="brand-logo-image" src={brandLogo} alt="Acquittal Luxury Apparel" decoding="async" />
        </a>
        <nav className={`desktop-nav ${menuOpen ? "mobile-nav-open" : ""}`} aria-label="Main navigation">
          {navLinks.map(link => (
            <a
              href={link.href}
              key={link.href}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a href="/shop" onClick={() => setMenuOpen(false)}>
            All pieces
          </a>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className="bag-button"
            onClick={openCart}
            aria-label={`Open shopping bag with ${itemCount} items`}
          >
            <span className="bag-label">Bag</span>
            <ShoppingBag size={18} strokeWidth={1.5} />
            <span className="bag-count">{itemCount}</span>
          </button>
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen(value => !value)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <span>MENU</span>}
          </button>
        </div>
      </header>
    </>
  );
}

export function StoreFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <a className="brand-wordmark footer-wordmark" href="/#top" aria-label="Acquittal Luxury Apparel home">
          <img className="brand-logo-image footer-brand-logo" src={brandLogo} alt="Acquittal Luxury Apparel" loading="lazy" decoding="async" />
        </a>
        <p>
          Good clothes.
          <br />
          <em>Good days.</em>
        </p>
        <a className="back-top" href="/#top">
          BACK TO TOP
          <ArrowRight size={15} />
        </a>
      </div>
      <div className="footer-bottom">
        <span>© 2026 ACQUITTAL · LUXURY APPAREL</span>
        <a href="/admin">STUDIO LOGIN</a>
        <span>MADE TO BE WORN</span>
      </div>
    </footer>
  );
}
