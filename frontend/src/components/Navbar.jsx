import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

function Navbar() {
  const [showSignupDropdown, setShowSignupDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMegaMenu, setShowMegaMenu] = useState(false); // NEW: State for Mega Menu
  
  const signupDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const megaMenuRef = useRef(null); // NEW: Ref for Mega Menu
  
  const navigate = useNavigate();
  const location = useLocation();

  const isSignupPage = location.pathname === "/signup-mobile";

 // Change this in Navbar.jsx
const [user, setUser] = useState(null);

useEffect(() => {
  const checkUser = () => {
    const savedName = localStorage.getItem("userName");
    console.log("Navbar checking localStorage. Found:", savedName); 
    
    // If storage literally contains the string "null" or is empty, reset
    if (!savedName || savedName === "null" || savedName === "undefined") {
      setUser(null);
    } else {
      setUser(savedName);
    }
  };

  checkUser();
  
  // Listen for the login event
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
    // 1. Clear the session data
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userId");
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("pendingRideIntent"); // Clear search history on logout
  
    // 2. Force a full page reload to the home page
    // This clears all React states and forces the Navbar to re-check storage
    window.location.href = "/"; 
  };

  return (
    <div style={styles.navbar}>
      <div style={styles.leftSection}>
        <Link to="/" style={styles.link}>
          <h1 style={styles.logo}>Zovro</h1>
        </Link>
      </div>

      {!isSignupPage && (
        <div style={styles.rightSection}>
          {/* Support Link */}
          <Link to="/support" style={styles.supportLink}>Support</Link>

          {user ? (
            /* --- LOGGED IN: PROFILE MENU --- */
            <div style={{ position: "relative" }} ref={profileDropdownRef}>
              <div 
                style={styles.userTrigger} 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <div style={styles.avatar}>
                  {user.charAt(0).toUpperCase()}
                </div>
                <span style={styles.userName}>{user}</span>
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
            /* --- NOT LOGGED IN --- */
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

          {/* NEW: HAMBURGER MENU ICON */}
          <div style={{ position: "relative" }} ref={megaMenuRef}>
            <div style={styles.hamburger} onClick={() => setShowMegaMenu(!showMegaMenu)}>
              <div style={styles.bar}></div>
              <div style={styles.bar}></div>
              <div style={styles.bar}></div>
            </div>

            {/* NEW: MEGA MENU DROPDOWN (Matches your 2nd image) */}
            {showMegaMenu && (
              <div style={styles.megaMenu}>
                <div style={styles.megaMenuContent}>
                  {/* Left Section of Mega Menu */}
                  <div style={styles.megaLeft}>
                    <div style={styles.megaNavLinks}>
                      <span style={styles.activeMegaTab}>Products</span>
                      <span>Earn with Zovro</span>
                      <span>Company</span>
                      <span>Safety</span>
                      <span>Support</span>
                    </div>
                    <div style={styles.megaGrid}>
                      <div style={styles.megaColumn}>
                        <h4 style={styles.megaColTitle}>Rides</h4>
                        <p>Rider safety</p>
                        <p>Become a driver</p>
                      </div>
                      <div style={styles.megaColumn}>
                        <h4 style={styles.megaColTitle}>Business</h4>
                        <p>Work profile</p>
                        <p>Zovro for Business</p>
                      </div>
                      <div style={styles.megaColumn}>
                        <h4 style={styles.megaColTitle}>Food</h4>
                        <p>Zovro Market</p>
                        <p>Zovro Food</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Section of Mega Menu (Cards) */}
                  <div style={styles.megaRight}>
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
  // Existing Styles...
  navbar: {
    width: "100%", height: "64px", display: "flex", alignItems: "center",
    justifyContent: "space-between", padding: "0 40px", backgroundColor: "white",
    borderBottom: "1px solid #eee", position: "fixed", top: 0, left: 0, zIndex: 1100
  },
  leftSection: { display: "flex", alignItems: "center" },
  rightSection: { display: "flex", alignItems: "center", gap: "25px" },
  logo: { fontSize: "24px", fontWeight: "700", color: "#000", textDecoration: "none" },
  link: { textDecoration: "none" },
  supportLink: { textDecoration: "none", color: "#000", fontWeight: "500", fontSize: "15px" },

  // Hamburger Icon
  hamburger: {
    display: "flex", flexDirection: "column", gap: "4px", cursor: "pointer",
    padding: "8px", borderRadius: "8px", transition: "0.2s",
  },
  bar: { width: "18px", height: "2px", backgroundColor: "#000" },

  // Mega Menu (Second Image Logic)
  megaMenu: {
    position: "fixed", top: "64px", left: "5%", right: "5%",
    backgroundColor: "#f8f9fa", boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
    borderRadius: "16px", zIndex: 1000, padding: "30px", border: "1px solid #eee"
  },
  megaMenuContent: { display: "flex", gap: "40px" },
  megaLeft: { flex: 3 },
  megaRight: { flex: 1, display: "flex", flexDirection: "column", gap: "12px" },
  
  megaNavLinks: { display: "flex", gap: "25px", marginBottom: "30px", fontSize: "14px", fontWeight: "600", color: "#666" },
  activeMegaTab: { color: "#000", borderBottom: "2px solid #000", paddingBottom: "5px" },
  
  megaGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" },
  megaColTitle: { fontSize: "16px", marginBottom: "15px" },
  megaColumn: { color: "#555", fontSize: "14px", lineHeight: "2" },

  megaCard: {
    backgroundColor: "#fff", padding: "15px", borderRadius: "12px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    cursor: "pointer", border: "1px solid transparent", transition: "0.2s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  },
  cardInfo: { fontSize: "13px" },

  // Profile and Auth styles remain the same...
  loginBtn: { textDecoration: "none", color: "#000", fontWeight: "500" },
  signupBtn: { backgroundColor: "#000", color: "#fff", padding: "8px 16px", borderRadius: "20px", border: "none", fontWeight: "500", cursor: "pointer" },
  userTrigger: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  profileDropdown: { position: "absolute", top: "50px", right: "0", backgroundColor: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.15)", borderRadius: "12px", width: "260px", padding: "16px 0" },
  divider: { height: '1px', backgroundColor: '#eee', margin: '8px 0' },
  menuItem: { padding: '12px 20px', cursor: 'pointer' },
  logoutBtnFull: { width: '100%', padding: '12px 20px', backgroundColor: 'transparent', border: 'none', textAlign: 'left', color: '#e11d48' },
  dropdown: { position: "absolute", top: "45px", right: "0", backgroundColor: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "8px", width: "120px" },
  dropdownItem: { padding: "12px 16px", cursor: "pointer", fontSize: "14px" }
};

export default Navbar;