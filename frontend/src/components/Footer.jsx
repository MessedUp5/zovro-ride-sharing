import React from "react";

function Footer() {
  const footerData = {
    Products: ["Rides", "Scooters", "E-Bikes", "Zovro Drive", "Zovro Food", "Zovro Market"],
    Earn: ["Zovro Drivers", "Zovro Couriers", "Zovro Merchants", "Zovro Fleets"],
    Company: ["About Zovro", "Leadership", "Careers", "Sustainability", "Blog", "Brand"],
    Support: ["Riders", "Drivers", "Zovro Food", "Couriers", "Restaurants"],
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        {/* Brand Section */}
        <div style={styles.brandSection}>
          <h2 style={styles.logo}>Zovro</h2>
        </div>

        {/* Links Grid */}
        <div style={styles.linksGrid}>
          {Object.entries(footerData).map(([title, links]) => (
            <div key={title} style={styles.column}>
              <h4 style={styles.columnTitle}>{title}</h4>
              <ul style={styles.list}>
                {links.map((link) => (
                  <li key={link} style={styles.listItem}>{link}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div style={styles.divider} />
        <div style={styles.bottomBar}>
          <div style={styles.socials}>
             <span>EN</span>
             <div style={styles.icons}>𝕏 f i t</div>
          </div>
          <div style={styles.legal}>
            <span>Suppliers</span>
            <span>Terms</span>
            <span>Privacy</span>
            <span>© 2026 Zovro Technology</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    backgroundColor: "#000",
    color: "#fff",
    padding: "60px 0 30px 0",
    fontFamily: "sans-serif",
    marginTop: "auto", // Pushes footer to bottom
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 40px",
  },
  logo: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "40px",
  },
  linksGrid: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "30px",
    marginBottom: "60px",
  },
  column: {
    minWidth: "150px",
  },
  columnTitle: {
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "20px",
    color: "#fff",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  listItem: {
    fontSize: "14px",
    color: "#999", // Dimmed text like the screenshot
    marginBottom: "12px",
    cursor: "pointer",
  },
  divider: {
    height: "1px",
    backgroundColor: "#333",
    marginBottom: "30px",
  },
  bottomBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px",
  },
  socials: {
    display: "flex",
    gap: "20px",
    alignItems: "center",
  },
  legal: {
    display: "flex",
    gap: "20px",
    fontSize: "12px",
    color: "#999",
  }
};

export default Footer;