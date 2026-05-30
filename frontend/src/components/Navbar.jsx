import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

function Navbar() {
  const [showSignupDropdown, setShowSignupDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMegaMenu, setShowMegaMenu] = useState(false); 
  
  const signupDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const megaMenuRef = useRef(null); 
  
  const navigate = useNavigate();
  const location = useLocation();

  const isSignupPage = location.pathname === "/signup-mobile";
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = () => {
      const savedName = localStorage.getItem("userName");
      console.log("Navbar checking localStorage. Found:", savedName); 
      
      if (!savedName || savedName === "null" || savedName === "undefined") {
        setUser(null);
      } else {
        setUser(savedName);
      }
    };

    checkUser();
    window.addEventListener("storage", checkUser);
    return () => window.removeEventListener("storage", checkUser);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (signupDropdownRef.current && !signupDropdownRef.current.contains(event.target)) {
        setShowSignupDropdown(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (megaMenuRef.current && !megaMenuRef.current.contains(event.target)) {
        setShowMegaMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userId");
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("pendingRideIntent"); 
    window.location.href = "/"; 
  };

  return (
    <div style={styles.navbar} className="navbar-container">
      {/* Dynamic Responsive Styles Injection */}
      <style>{`
        @media (max-width: 768px) {
          .navbar-container {
            padding: 0 16px !important;
          }
          .nav-right-section {
            gap: 12px !important;
          }
          .nav-support-link {
            display: none !important; /* Hides desktop utility links to avoid squishing */
          }
          .nav-user-name {
            display: none !important; /* Shows only avatar circle on mobile header views */
          }
          
          /* Full Screen Overlay Transformation for Mobile Mega Menu */
          .responsive-mega-menu {
            left: 0 !important;
            right: 0 !important;
            top: 64px !important;
            width: 100vw !important;
            height: calc(100vh - 64px) !important;
            border-radius: 0 !important;
            border: none !important;
            overflow-y: auto !important;
            padding: 24px 16px !important;
            background-color: #000000 !important; /* Dark styling block like Image 3 */
            color: #ffffff !important;
          }
          .responsive-mega-content {
            flex-direction: column !important;
            gap: 24px !important;
          }
          .responsive-mega-left {
            flex: 1 !important;
          }
          .responsive-mega-nav {
            flex-direction: column !important;
            gap: 16px !important;
            margin-bottom: 24px !important;
          }
          .responsive-mega-nav span {
            font-size: 20px !important;
            font-weight: 700 !important;
            color: #888888 !important;
          }
          .responsive-mega-nav .active-tab-override {
            color: #ffffff !important;
            border-bottom: none !important;
            padding-bottom: 0 !important;
          }
          .responsive-mega-grid {
            grid-templateColumns: 1fr !important; /* Stacks child columns vertically */
            gap: 24px !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .responsive-mega-col-title {
            font-size: 18px !important;
            color: #ffffff !important;
            margin-bottom: 8px !important;
            font-weight: 600 !important;
          }
          .responsive-mega-column p {
            color: #aaaaaa !important;
            font-size: 15px !important;
            line-height: 2.2 !important;
          }
          .responsive-mega-right {
            display: none !important; /* Optional: Hides wide desktop layout promo cards on mobile viewports */
          }
        }
      `}</style>

      <div style={styles.leftSection}>
        <Link to="/" style={styles.link}>
          <h1 style={styles.logo}>Zovro</h1>
        </Link>
      </div>

      {!isSignupPage && (
        <div style={styles.rightSection} className="nav-right-section">
          <Link to="/support" style={styles.supportLink} className="nav-support-link">Support</Link>

          {user ? (
            <div style={{ position: "relative" }} ref={profileDropdownRef}>
              <div 
                style={styles.userTrigger} 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <div style={styles.avatar}>
                  {user.charAt(0).toUpperCase()}
                </div>
                <span style={styles.userName} className="nav-user-name">{user}</span>
              </div>

              {showProfileDropdown && (
                <div style={styles.profileDropdown}>
                  <div style={styles.profileHeader}>
                    <div style={styles.headerText}>
                      <span style={styles.fullUserName}>{user}</span>
                      <span style={styles.rating}>★ 5.00</span>
                    </div>
                  </div>
                  <div style={styles.divider} />
                  <div style={styles.menuItem} onClick={() => navigate("/rider-home")}>Ride</div>
                  <div style={styles.menuItem}>Activity</div>
                  <div style={styles.menuItem}>Wallet</div>
                  <div style={styles.menuItem}>Settings</div>
                  <div style={styles.divider} />
                  <button onClick={handleLogout} style={styles.logoutBtnFull}>Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" style={styles.loginBtn}>Log in</Link>
              <div style={{ position: "relative" }} ref={signupDropdownRef}>
                <button 
                  style={styles.signupBtn} 
                  onClick={() => setShowSignupDropdown(!showSignupDropdown)}
                >
                  Sign up
                </button>

                {showSignupDropdown && (
                  <div style={styles.dropdown}>
                    <div style={styles.dropdownItem} onClick={() => { setShowSignupDropdown(false); navigate("/signup-mobile", { state: { role: "rider" } }); }}>Ride</div>
                    <div style={styles.dropdownItem} onClick={() => { setShowSignupDropdown(false); navigate("/signup-mobile", { state: { role: "driver" } }); }}>Earn</div>
                    <div style={styles.dropdownItem} onClick={() => { setShowSignupDropdown(false); navigate("/signup-mobile"); }}>Zovro Food</div>
                    <div style={styles.dropdownItem} onClick={() => { setShowSignupDropdown(false); navigate("/signup-mobile"); }}>Business</div>
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{ position: "relative" }} ref={megaMenuRef}>
            <div style={styles.hamburger} onClick={() => setShowMegaMenu(!showMegaMenu)}>
              <div style={styles.bar}></div>
              <div style={styles.bar}></div>
              <div style={styles.bar}></div>
            </div>

            {showMegaMenu && (
              <div style={styles.megaMenu} className="responsive-mega-menu">
                <div style={styles.megaMenuContent} className="responsive-mega-content">
                  <div style={styles.megaLeft} className="responsive-mega-left">
                    <div style={styles.megaNavLinks} className="responsive-mega-nav">
                      <span style={styles.activeMegaTab} className="active-tab-override">Products</span>
                      <span>Earn with Zovro</span>
                      <span>Company</span>
                      <span>Safety</span>
                      <span>Support</span>
                    </div>
                    <div style={styles.megaGrid} className="responsive-mega-grid">
                      <div style={styles.megaColumn} className="responsive-mega-column">
                        <h4 style={styles.megaColTitle} className="responsive-mega-col-title">Products</h4>
                        <p onClick={() => { setShowMegaMenu(false); navigate("/rider-home"); }} style={{cursor: "pointer"}}>Rides</p>
                        <p>Scooters</p>
                        <p>E-Bikes</p>
                        <p>Zovro Drive</p>
                        <p>Zovro Food</p>
                        <p>Zovro Market</p>
                      </div>
                      <div style={styles.megaColumn} className="responsive-mega-column">
                        <h4 style={styles.megaColTitle} className="responsive-mega-col-title">Earn</h4>
                        <p>Zovro Drivers</p>
                        <p>Zovro Couriers</p>
                        <p>Zovro Merchants</p>
                        <p>Zovro Fleets</p>
                      </div>
                      <div style={styles.megaColumn} className="responsive-mega-column">
                        <h4 style={styles.megaColTitle} className="responsive-mega-col-title">Company</h4>
                        <p>About Zovro</p>
                        <p>Leadership</p>
                        <p>Careers</p>
                        <p>Sustainability</p>
                        <p>Blog</p>
                        <p>Brand</p>
                      </div>
                    </div>
                  </div>

                  <div style={styles.megaRight} className="responsive-mega-right">
                    <div style={styles.megaCard}>
                      <div style={styles.cardInfo}>
                        <strong>Become a driver</strong>
                        <p>Make money on your terms</p>
                      </div>
                      <span>→</span>
                    </div>
                    <div style={styles.megaCard}>
                      <div style={styles.cardInfo}>
                        <strong>Become a courier</strong>
                        <p>Deliver food and get paid weekly</p>
                      </div>
                      <span>→</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  navbar: {
    width: "100%", height: "64px", display: "flex", alignItems: "center",
    justifyContent: "space-between", padding: "0 40px", backgroundColor: "white",
    borderBottom: "1px solid #eee", position: "fixed", top: 0, left: 0, zIndex: 1100,
    boxSizing: "border-box"
  },
  leftSection: { display: "flex", alignItems: "center" },
  rightSection: { display: "flex", alignItems: "center", gap: "25px" },
  logo: { fontSize: "24px", fontWeight: "700", color: "#000", textDecoration: "none" },
  link: { textDecoration: "none" },
  supportLink: { textDecoration: "none", color: "#000", fontWeight: "500", fontSize: "15px" },

  hamburger: {
    display: "flex", flexDirection: "column", gap: "4px", cursor: "pointer",
    padding: "8px", borderRadius: "8px", transition: "0.2s",
  },
  bar: { width: "18px", height: "2px", backgroundColor: "#000" },

  megaMenu: {
    position: "fixed", top: "64px", left: "5%", right: "5%",
    backgroundColor: "#fff", boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
    borderRadius: "16px", zIndex: 1000, padding: "30px", border: "1px solid #eee"
  },
  megaMenuContent: { display: "flex", gap: "40px" },
  megaLeft: { flex: 3 },
  megaRight: { flex: 1, display: "flex", flexDirection: "column", gap: "12px" },
  
  megaNavLinks: { display: "flex", gap: "25px", marginBottom: "30px", fontSize: "14px", fontWeight: "600", color: "#666" },
  activeMegaTab: { color: "#000", borderBottom: "2px solid #000", paddingBottom: "5px" },
  
  megaGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" },
  megaColTitle: { fontSize: "16px", marginBottom: "15px", fontWeight: "700" },
  megaColumn: { color: "#555", fontSize: "14px", lineHeight: "2" },

  megaCard: {
    backgroundColor: "#fff", padding: "15px", borderRadius: "12px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    cursor: "pointer", border: "1px solid transparent", transition: "0.2s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  },
  cardInfo: { fontSize: "13px" },

  loginBtn: { textDecoration: "none", color: "#000", fontWeight: "500", fontSize: "15px", whiteSpace: "nowrap" },
  signupBtn: { backgroundColor: "#000", color: "#fff", padding: "8px 16px", borderRadius: "20px", border: "none", fontWeight: "500", cursor: "pointer", fontSize: "15px", whiteSpace: "nowrap" },
  userTrigger: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  userName: { fontSize: "15px", fontWeight: "500" },
  profileDropdown: { position: "absolute", top: "50px", right: "0", backgroundColor: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.15)", borderRadius: "12px", width: "260px", padding: "16px 0" },
  divider: { height: '1px', backgroundColor: '#eee', margin: '8px 0' },
  menuItem: { padding: '12px 20px', cursor: 'pointer', color: "#000" },
  logoutBtnFull: { width: '100%', padding: '12px 20px', backgroundColor: 'transparent', border: 'none', textAlign: 'left', color: '#e11d48', cursor: 'pointer' },
  dropdown: { position: "absolute", top: "45px", right: "0", backgroundColor: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "8px", width: "120px" },
  dropdownItem: { padding: "12px 16px", cursor: "pointer", fontSize: "14px" }
};

export default Navbar;