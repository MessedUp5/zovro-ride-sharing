import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig"; 
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

function Login() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1: Mobile, 2: OTP
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Initialize and Cleanup Recaptcha
  useEffect(() => {
    const initRecaptcha = () => {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => {
            console.log("reCAPTCHA solved");
          }
        });
      }
    };

    initRecaptcha();

    // Cleanup: Remove the verifier when user leaves the page
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const handleSendOTP = () => {
    setLoading(true);

    // Safety check: if verifier was cleared, recreate it
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }

    const formatPh = "+94" + (mobile.startsWith('0') ? mobile.substring(1) : mobile);

    signInWithPhoneNumber(auth, formatPh, window.recaptchaVerifier)
      .then((confirmation) => {
        setConfirmationResult(confirmation);
        setStep(2); 
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
        console.error("SMS Error:", error);
        alert("Error: " + error.message);
        // Reset reCAPTCHA on error so the user can try again
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
      });
  };

  const handleVerifyOTP = () => {
    setLoading(true);
    confirmationResult.confirm(otp)
      .then(async (result) => {
        const firebaseUser = result.user;
  
        try {
          const response = await fetch(`https://zovro-ride-sharing.vercel.app/api/auth/login-firebase`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firebase_uid: firebaseUser.uid }),
          });
          
          const data = await response.json();
          console.log("Backend Response:", data);
  
          // Inside handleVerifyOTP, replace the localStorage section with this:

if (data && data.user) {
  // 1. Create a unified user object to match what DriverHome expects
  const userObject = {
      uid: firebaseUser.uid,         // The Firebase UID
      id: data.user.id,               // Your Database ID
      first_name: data.user.first_name,
      user_type: data.user.user_type
  };

  // 2. Save the unified object as a string
  localStorage.setItem("user", JSON.stringify(userObject));

  // 3. Keep your other individual items if other components use them
  localStorage.setItem("userName", data.user.first_name);
  localStorage.setItem("userId", data.user.id);
  localStorage.setItem("userRole", data.user.user_type);
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("token", data.token);
  
  window.dispatchEvent(new Event("storage"));

  // 4. Redirection Logic
  if (data.user.user_type === "driver") {
      navigate("/driver-home");
  } else {
      navigate("/rider-home");
  }
} else {
            navigate("/signup-mobile");
          }
        } catch (error) {
          console.error("Backend Sync Error:", error);
          alert("Login successful, but failed to sync profile data.");
        } finally {
          setLoading(false);
        }
      })
      .catch((error) => {
        setLoading(false);
        alert("Invalid code. Please try again.");
      });
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", fontFamily: 'sans-serif' }}>
      <Navbar />
      
      {/* IMPORTANT: Keep container visible at all times to prevent 'removed' error */}
      <div id="recaptcha-container"></div>
      
      <div style={styles.container}>
        {step === 1 ? (
          <>
            <h2 style={styles.heading}>Enter your mobile number</h2>
            <p style={styles.subtext}>We'll send a code to verify your number.</p>
            
            <div style={styles.inputGroup}>
              <div style={styles.countryCode}>LK +94</div>
              <input 
                type="tel" 
                value={mobile} 
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} 
                style={styles.input} 
                placeholder="7X XXX XXXX"
              />
            </div>
            
            <button style={styles.nextBtn} onClick={handleSendOTP} disabled={loading || mobile.length < 9}>
              {loading ? "Sending..." : "Next"}
            </button>
          </>
        ) : (
          <>
            <h2 style={styles.heading}>Enter the 6-digit code</h2>
            <p style={styles.subtext}>Sent to +94 {mobile}</p>
            
            <input 
              type="text" 
              maxLength="6" 
              placeholder="1 2 3 4 5 6"
              value={otp} 
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
              style={styles.otpInput} 
            />
            
            <button style={styles.nextBtn} onClick={handleVerifyOTP} disabled={loading || otp.length < 6}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>

            <p style={styles.linkText} onClick={() => { setStep(1); setOtp(""); }}>
              Edit number
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { 
    paddingTop: "180px", 
    maxWidth: "420px", 
    margin: "0 auto", 
    paddingLeft: "24px", 
    paddingRight: "24px",
    textAlign: 'center' 
  },
  heading: { 
    fontSize: "32px", 
    fontWeight: "700", 
    marginBottom: "12px",
    color: '#000',
    lineHeight: '1.2'
  },
  subtext: { 
    fontSize: '16px',
    color: "#545454", 
    marginBottom: "32px" 
  },
  inputGroup: {
    display: "flex", 
    gap: "12px",
    marginBottom: "24px"
  },
  countryCode: { 
    padding: "12px 16px", 
    backgroundColor: "#f6f6f6", 
    borderRadius: "8px", 
    fontWeight: "600", 
    display: 'flex', 
    alignItems: 'center'
  },
  input: { 
    flex: 1, 
    padding: "12px 16px", 
    fontSize: "16px", 
    borderRadius: "8px", 
    border: "1px solid #e2e2e2",
    width: '100%', 
    boxSizing: 'border-box',
    outline: 'none'
  },
  otpInput: {
    width: '100%',
    padding: "12px 16px",
    fontSize: "24px",
    borderRadius: "8px",
    border: "1px solid #e2e2e2",
    textAlign: 'center',
    letterSpacing: '12px', 
    backgroundColor: '#fff',
    outline: 'none',
    boxSizing: 'border-box'
  },
  nextBtn: { 
    width: "100%", 
    padding: "14px", 
    backgroundColor: "#000", 
    color: "#fff", 
    border: "none", 
    borderRadius: "8px", 
    fontSize: "18px", 
    fontWeight: "700", 
    cursor: "pointer",
    marginTop: "20px"
  },
  linkText: { 
    marginTop: '20px', 
    color: '#276ef1', 
    cursor: 'pointer', 
    fontSize: '14px', 
    fontWeight: '500',
    textDecoration: 'none'
  }
};

export default Login;