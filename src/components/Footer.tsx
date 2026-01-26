const Footer = () => {
  return (
    <footer className="bg-muted/30 border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-primary to-accent p-2 rounded-xl">
                <span className="text-xl">🛒</span>
              </div>
              <span className="text-xl font-bold gradient-text">SNACKZO</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Your trusted instant delivery partner. Snacks, drinks & essentials delivered to your doorstep in minutes.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold uppercase text-sm mb-4 text-primary">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/products" className="hover:text-foreground transition-colors">All Products</a></li>
              <li><a href="/orders" className="hover:text-foreground transition-colors">Track Order</a></li>
              <li><a href="/auth" className="hover:text-foreground transition-colors">Login / Sign Up</a></li>
            </ul>
          </div>

          {/* Timing */}
          <div>
            <h3 className="font-bold uppercase text-sm mb-4 text-secondary">Timing</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Mon - Sun: 8 AM - 3 AM</li>
              <li>Delivery Time: ~15 mins</li>
              <li>Doorstep Delivery: +₹10</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold uppercase text-sm mb-4 text-accent">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>📍 Chennai, Tamil Nadu</li>
              <li>📞 +91 9952111626</li>
              <li>✉️ codewithsachin10@gmail.com</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-1">
            © 2024 Snackzo. Made with 💜 by <span className="text-primary font-bold">Sachin</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
