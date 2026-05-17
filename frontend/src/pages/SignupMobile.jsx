import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import { auth } from "../firebaseConfig";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// 1. Firebase Configuration (Must be outside)
const firebaseConfig = {
  apiKey: "AIzaSyCGQmgTir0aW4aXmHTdZqdUXMHWt1N7n4U",
  authDomain: "zovro-45f04.firebaseapp.com",
  projectId: "zovro-45f04",
  storageBucket: "zovro-45f04.firebasestorage.app",
  messagingSenderId: "1072186079842",
  appId: "1:1072186079842:web:a8506b738accc0633e6f3b",
  measurementId: "G-7LR88B0F5G"
};

// Add 'role' to the parameters
const syncWithPostgres = async (firebaseUser, fName, lName, role) => { 
  try {
    const response = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fName,
        lastName: lName,
        phone_number: firebaseUser.phoneNumber,
        firebase_uid: firebaseUser.uid,
        user_type: role, // Use the variable instead of the string "rider"
        email: `${firebaseUser.uid}@zovro.com`,
        password: "firebase_authenticated" 
      }),
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.error("PostgreSQL Sync Error:", err);
    return null;
  }
};

function SignupMobile() {
  const location = useLocation();
  const [userRole, setUserRole] = useState(location.state?.role || "rider");
  console.log("SignupMobile is holding role:", userRole);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [step, setStep] = useState(1); // 1: Number, 2: OTP, 3: Names, 4: Payment
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  console.log("Current detected role:", userRole);

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }
  }, []);

  // --- LOGIC FUNCTIONS ---
  
  const handleSendOTP = () => {
    setLoading(true);
    const cleanMobile = mobile.startsWith('0') ? mobile.substring(1) : mobile;
    const formatPh = "+94" + cleanMobile;

    signInWithPhoneNumber(auth, formatPh, window.recaptchaVerifier)
      .then((confirmation) => {
        setConfirmationResult(confirmation);
        setStep(2);
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
        console.error("SMS Error:", error);
        alert("Failed to send SMS.");
      });
  };

  const handleVerifyOTP = () => {
    setLoading(true);
    confirmationResult.confirm(otp)
      .then(() => {
        setLoading(false);
        setStep(3); 
      })
      .catch(() => {
        setLoading(false);
        alert("Invalid code. Please try again.");
      });
  };

  const handleCompleteProfile = () => {
    // Moves to Payment Step
    setStep(4);
  };

  const goToHome = async () => {
    setLoading(true);
    const firebaseUser = auth.currentUser;
  
    if (firebaseUser) {
      // 1. Detect the role (driver or rider) from the location state
      const userRole = location.state?.role || "rider"; 
  
      // 2. Pass that role to the sync function
      const result = await syncWithPostgres(firebaseUser, firstName, lastName, userRole);
      
      // 3. Save the role locally so the UI stays consistent
      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userName", firstName);
      localStorage.setItem("isLoggedIn", "true");
  
      window.dispatchEvent(new Event("storage"));
      
      // 4. Redirect based on the role
      if (userRole === "driver") {
        window.location.href = "/driver-home";
      } else {
        window.location.href = "/rider-home";
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", fontFamily: 'Manrope, serif' }}>
      <Navbar />
      <div id="recaptcha-container"></div>

      <div style={styles.container}>
        
        {/* STEP 1: MOBILE ENTRY */}
        {step === 1 && (
          <>
            <h2 style={styles.heading}>Enter your mobile number</h2>
            <p style={styles.subtext}>We'll send a code to verify your number.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={styles.countryCode}>🇱🇰 +94</div>
              <input 
                type="tel" 
                placeholder="7X XXX XXXX" 
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                style={styles.input}
              />
            </div>
            <button style={styles.nextBtn} onClick={handleSendOTP} disabled={loading || mobile.length < 9}>
              {loading ? "Processing..." : "Next"}
            </button>
          </>
        )}

        {/* STEP 2: OTP ENTRY */}
        {step === 2 && (
          <>
            <h2 style={styles.heading}>Enter the 6-digit code</h2>
            <p style={styles.subtext}>Sent to +94 {mobile}</p>
            <input 
              type="text" 
              maxLength="6"
              placeholder="123456" 
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              style={{ ...styles.input, textAlign: 'center', letterSpacing: '8px', fontSize: '24px' }}
            />
            <button style={styles.nextBtn} onClick={handleVerifyOTP} disabled={loading || otp.length < 6}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
            <p style={styles.linkText} onClick={() => setStep(1)}>Edit number</p>
          </>
        )}

        {/* STEP 3: NAME ENTRY */}
        {step === 3 && (
          <>
            <h2 style={styles.heading}>
       {userRole === "driver" ? "Setup Driver Profile" : "Set up your profile"}
    </h2>
    <p style={styles.subtext}>
       {userRole === "driver" ? "Tell us who's hitting the road." : "Almost there! Just tell us your name."}
    </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="text" 
                placeholder="First Name" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={styles.input}
              />
              <input 
                type="text" 
                placeholder="Last Name" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={styles.input}
              />
            </div>
            <button style={styles.nextBtn} onClick={handleCompleteProfile} disabled={!firstName || !lastName}>
              Get Started
            </button>
          </>
        )}

        {/* STEP 4: PAYMENT ENTRY */}
        {step === 4 && (
          <>
            <h2 style={styles.heading}>Add payment method</h2>
            <p style={styles.subtext}>Add a card to enjoy seamless payments.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="text" 
                placeholder="Card Number (0000 0000 0000 0000)" 
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                style={styles.input}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                 <input type="text" placeholder="MM/YY" style={styles.input} />
                 <input type="text" placeholder="CVV" style={styles.input} />
              </div>
            </div>
            <button style={styles.nextBtn} onClick={goToHome}>
              Add Card
            </button>
            <button 
              style={{ ...styles.nextBtn, backgroundColor: 'transparent', color: '#666', marginTop: '10px' }} 
              onClick={goToHome}
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { paddingTop: "160px", maxWidth: "400px", margin: "0 auto", paddingLeft: "20px", paddingRight: "20px" },
  heading: { fontSize: "28px", marginBottom: "10px", color: '#111', fontWeight: '600' },
  subtext: { color: "#666", marginBottom: "30px" },
  countryCode: { padding: "12px", backgroundColor: "#f3f3f3", borderRadius: "8px", fontWeight: "bold", display: 'flex', alignItems: 'center' },
  input: { flex: 1, padding: "12px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ccc", outline: "none", width: '100%', boxSizing: 'border-box' },
  nextBtn: { marginTop: "30px", width: "100%", padding: "15px", backgroundColor: "#000", color: "white", border: "none", borderRadius: "8px", fontSize: "18px", fontWeight: "bold", cursor: "pointer" },
  linkText: { marginTop: '15px', color: '#276ef1', cursor: 'pointer', fontSize: '14px', textAlign: 'center' }
};

export default SignupMobile;