import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./RiderHome.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";
import { useMapEvents } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import RideOptions from "./RideOptions"; // Adjust the path as necessary

function ChangeMapView({ coords }) {
  const map = useMap();
  if (coords.lat && coords.lng) {
    map.setView([coords.lat, coords.lng], 14);
  }
  return null;
}

function RiderHome() {
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [pickupCoords, setPickupCoords] = useState({ lat: null, lng: null });
  const [dropCoords, setDropCoords] = useState({ lat: null, lng: null });
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState("Detecting location...");
  const [currentLocation, setCurrentLocation] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [selectedLatLng, setSelectedLatLng] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [dropQuery, setDropQuery] = useState("");
  const [dropResults, setDropResults] = useState([]);
  const [showDropDropdown, setShowDropDropdown] = useState(false);
  const [selectingField, setSelectingField] = useState(null); 
  const dropdownRef = useRef(null);
  const dropRef = useRef(null);
  const navigate = useNavigate();
  const [currentCoords, setCurrentCoords] = useState({ lat: null, lng: null });
  const [showRideOptions, setShowRideOptions] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(localStorage.getItem("isLoggedIn") === "true");
  const [userId, setUserId] = useState(localStorage.getItem("userId"));

  useEffect(() => {
    const checkAuth = () => {
      const status = localStorage.getItem("isLoggedIn") === "true";
      const storedUserId = localStorage.getItem("userId");
      const storedUserName = localStorage.getItem("userName"); // Optional: if you want to greet them
  
      setUserLoggedIn(status);
      setUserId(storedUserId);
  
      // If they just logged in and we have a pending ride, trigger the view immediately
      if (status && localStorage.getItem("pendingRideIntent")) {
        setShowRideOptions(true);
      }
    };
  
    checkAuth();
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  const handleViewPrices = () => {
    // Always show the options section first so they see the "Choose a ride" list
    setShowRideOptions(true);
  
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  
    if (!isLoggedIn) {
      // Save the ride intent so we can recover it after they log in
      const rideIntent = {
        pickup: pickup,
        drop: drop,
        pickupCoords: pickupCoords,
        dropCoords: dropCoords,
        timestamp: Date.now()
      };
      localStorage.setItem("pendingRideIntent", JSON.stringify(rideIntent));
      
      // We don't navigate yet! The Modal below handles the click.
    }
  };

  useEffect(() => {
    const savedIntent = localStorage.getItem("pendingRideIntent");
    
    if (savedIntent) {
      const rideData = JSON.parse(savedIntent);
      
      // 1. Restore the text and coordinates to the inputs
      setPickup(rideData.pickup);
      setDrop(rideData.drop);
      setPickupCoords(rideData.pickupCoords);
      setDropCoords(rideData.dropCoords);
  
      // 2. Clear the storage ONLY if we are navigating away 
      // to avoid the "loop" where it keeps redirecting
    }
  }, []); // Runs once when you return to the home page
  
  // CLOSE DROPDOWN WHEN CLICK OUTSIDE
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If clicking outside the Pickup area, close pickup dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      
      // If clicking outside the Drop-off area, close drop dropdown
      // (Note: We'll add a ref to the drop-off container in the next step)
      if (dropRef.current && !dropRef.current.contains(event.target)) {
        setShowDropDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ DEBOUNCE SEARCH (FIXED)
  useEffect(() => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchPlaces(query, "pickup");
    }, 600); // debounce delay

    return () => clearTimeout(timer);
  }, [query]);

  // GPS LOCATION
useEffect(() => {
  if (!navigator.geolocation) {
    console.error("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      const safeCoords = { lat, lng };
        setCurrentCoords(safeCoords);
        setPickupCoords(safeCoords); 
        fetchLocation(lat, lng);
    },
    (error) => {
      console.error("GPS Error Code:", error.code);
      // Only set to Colombo if the user actually denied permission
      if (error.code === 1) { 
        setLocation("Location Permission Denied");
      }
    },
    { enableHighAccuracy: true, timeout: 10000 } // Give it 10 seconds to find your house
  );
}, []);

  useEffect(() => {
    if (!dropQuery || dropQuery.length < 3) {
      setDropResults([]);
      return;
    }
  
    const timer = setTimeout(() => {
      searchPlaces(dropQuery, "drop");
    }, 600);
  
    return () => clearTimeout(timer);
  }, [dropQuery]);


  function MapClickHandler({ setSelectedLatLng, setSelectedAddress }) {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
  
        console.log("Map clicked:", lat, lng);
  
        setSelectedLatLng({ lat, lng });
  
        fetch(
          `https://zovro-backend.vercel.app/api/location/reverse?lat=${lat}&lon=${lng}`
        )
          .then((res) => res.json())
          .then((data) => {
            const address =
              data?.display_name ||
              data?.address?.city ||
              data?.address?.town ||
              data?.address?.village ||
              `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  
            setSelectedAddress(address);
          })
          .catch(() => {
            setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          });
      },
    });
  
    return null;
  }

  const fetchLocation = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://zovro-backend.vercel.app/api/location/reverse?lat=${lat}&lon=${lng}`
      );

      const data = await res.json();

      const fullLocation =
  data.display_name ||
  `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

setLocation(fullLocation);
setCurrentLocation(fullLocation);

    } catch (err) {
      setLocation("Colombo, Sri Lanka");
      setCurrentLocation("Colombo, Sri Lanka");
    }
  };

  // ✅ SAFE SEARCH FUNCTION (FIXED 429 HANDLING)
  const searchPlaces = async (text, type = "pickup") => {
    if (!text) return;
  
    try {
      const res = await fetch(
        `https://zovro-backend.vercel.app/api/location/search?q=${encodeURIComponent(text)}`
      );
  
      const data = await res.json();
  
      if (Array.isArray(data)) {
        if (type === "pickup") {
          setSearchResults(data);
        } else {
          setDropResults(data);
        }
      } else {
        console.error("Invalid response:", data);
      }
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const handleRequestRide = async () => {
    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId"); // Add this

      const response = await axios.post(
        "https://zovro-backend.vercel.app/api/rides/request",
        {
          user_id: userId, // Pass the ID from storage
          pickup_location: pickup,
          drop_location: drop,
          pickup_lat: pickupCoords?.lat, // Use the specific state variables
          pickup_lng: pickupCoords?.lng,
          drop_lat: dropCoords?.lat,
          drop_lng: dropCoords?.lng,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage(response.data.message);
    } catch (error) {
      setMessage("Error requesting ride");
    }
  };

  return (
    <div className="rider-home-wrapper">
      <Navbar />

      <div className="hero-section">
      <div className="hero-content">
        <h1>Move the way you want</h1>
        <p>
          Reliable rides in minutes. Whether you're heading to work or across town, 
          get there safely and comfortably with just a few taps.
        </p>
        <div className="hero-buttons">
        <button className="btn-secondary">Get Zovro</button>
          <button className="btn-primary">Get a Ride</button>
          <button className="btn-secondary">Get Zovro Food</button>
        </div>
      </div>
    </div>
  
      <div className="rider-layout">
        <div className="left-panel">
          <div className="request-card">
            <div className="location-badge">{location}</div>
            <h1>Request a ride</h1>
            <div className="input-group">
              <div style={{ position: "relative" }} ref={dropdownRef}>
              <div className="input-wrapper">
                <input
                  placeholder="Enter Pickup"
                  value={pickup}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(e) => {
                    setPickup(e.target.value);
                    setQuery(e.target.value);
                  }}
                />

              {pickup && (
    <span
      className="clear-btn"
      onClick={() => {
        setPickup("");
        setQuery("");
        setSearchResults([]);
        setSelectedLatLng(null);
        setSelectedAddress("");
      }}
    >
      ✕
    </span>
  )}
</div>
  
                {showDropdown && (
                  <div className="dropdown">
                    <div className="dropdown-item" onClick={() => { 
                      setPickup(currentLocation); 
                      setPickupCoords(currentCoords); 
                      setShowDropdown(false); }}>
                      Use current location <br /> <small>{currentLocation}</small>
                    </div>
                    <div className="dropdown-item" onClick={() => { setShowDropdown(false); setSelectingField("pickup"); setShowMap(true); }}>
                      Search on map
                    </div>
                    {searchResults.map((place, i) => (
                      <div key={i} className="dropdown-item" onClick={() => { 
                        setPickup(place.display_name); 
                        setPickupCoords({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
                        setShowDropdown(false); }}>
                        {place.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
  
              <div style={{ position: "relative" }} ref={dropRef}>
              <div className="input-wrapper">
    <input
      placeholder="Enter Dropoff"
      value={drop}
      onFocus={() => {
        setShowDropDropdown(true);
        setShowDropdown(false);
      }}
      onChange={(e) => {
        setDrop(e.target.value);
        setDropQuery(e.target.value);
      }}
    />

    {drop && (
      <span
        className="clear-btn"
        onClick={() => {
          setDrop("");
          setDropQuery("");
          setDropResults([]);
        }}
      >
        ✕
      </span>
    )}
  </div>

  {showDropDropdown && (
    <div className="dropdown">

      {/* 🔥 SEARCH ON MAP */}
      <div
        className="dropdown-item"
        onClick={() => {
          setShowDropDropdown(false);
          setSelectingField("drop");
          setShowMap(true);
        }}
      >
        Search on map
      </div>

      {/* RESULTS */}
      {dropResults.map((place, i) => (
        <div
          key={i}
          className="dropdown-item"
          onClick={() => {
            setDrop(place.display_name);
            setDropCoords({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
            setShowDropDropdown(false);
            setDropResults([]);
          }}
        >
          {place.display_name}
        </div>
      ))}
    </div>
  )}
</div>
            </div>
            <button
  className="request-btn"
  disabled={!pickup || !drop}
  onClick={() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

    // 1. Validation check (Keep this)
    if (!pickupCoords?.lat || !dropCoords?.lat) {
      alert("⚠️ Please select locations from the dropdown");
      return;
    }

    if (isLoggedIn) {
      // 2. NAVIGATE to the new page instead of setting showRideOptions
      navigate("/ride-options", {
        state: {
          pickup,
          drop,
          pickupLat: pickupCoords.lat,
          pickupLng: pickupCoords.lng,
          dropLat: dropCoords.lat,
          dropLng: dropCoords.lng
        }
      });
    } else {
      // 3. If not logged in, show the login modal on this page
      handleViewPrices(); 
    }
  }}
>
  {userLoggedIn ? "Choose a Ride" : "View Prices"}
</button>
          </div>
        </div>

{showRideOptions && (
  <div className="results-container" style={{ width: "100%", marginTop: "20px" }}>
    
    {console.log("Passing to RideOptions:", pickupCoords, dropCoords)}


    {/* 2. THE MODAL (FIXED CENTERED OVERLAY) */}
    {!userLoggedIn && (
      <div style={modalStyles.overlay}>
        <div style={modalStyles.content}>
          <h2 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "16px" }}>
            To see ride options
          </h2>
          <p style={{ color: "#545454", fontSize: "16px", lineHeight: "1.6", marginBottom: "30px" }}>
            Please take a moment to quickly log in or sign up so we can show you your ride options.
          </p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button 
              style={modalStyles.button} 
              onClick={() => navigate("/login")}
            >
              Log in
            </button>
            <button 
              style={{ ...modalStyles.button, backgroundColor: "#eee", color: "#000" }} 
              onClick={() => navigate("/signup-mobile")}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)}
        {showMap && (
          <div className="right-panel">
            <MapContainer
              center={[6.9271, 79.8612]}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClickHandler setSelectedLatLng={setSelectedLatLng} setSelectedAddress={setSelectedAddress} />
              {selectedLatLng && <Marker position={[selectedLatLng.lat, selectedLatLng.lng]} />}
              </MapContainer>
              <button 
                onClick={() => {
                  setShowMap(false);
                  setSelectedLatLng(null);
                  setSelectedAddress("");
                  setSelectingField(null);
                }}
                style={{ position: "absolute", 
                        top: 10, 
                        right: 10, 
                        zIndex: 1000, 
                        background: "rgba(255, 255, 255, 0.9)", 
                        border: "none", 
                        borderRadius: "50%", 
                        width: "24px", 
                        height: "24px", 
                        cursor: "pointer", 
                        fontSize: "14px", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        lineHeight: "0"
                }}
              >
                ✕
              </button>
              <div
      style={{
        position: "absolute",
        bottom: 10,
        left: 10,
        right: 10,
        background: "#fff",
        padding: "12px",
        borderRadius: "10px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        zIndex: 1000
      }}
    >
      <p style={{ margin: 0, fontWeight: "bold" }}>Selected:</p>

      <p style={{ margin: "5px 0" }}>
        {selectedAddress ||
          (selectedLatLng
            ? `${selectedLatLng.lat.toFixed(5)}, ${selectedLatLng.lng.toFixed(5)}`
            : "Tap on map to choose location")}
      </p>

      <button
        className="request-btn"
        style={{ width: "100%", marginTop: "8px" }}
        disabled={!selectedLatLng}
        onClick={() => {
          const finalAddress =
            selectedAddress ||
            `${selectedLatLng.lat.toFixed(5)}, ${selectedLatLng.lng.toFixed(5)}`;
        
          if (selectingField === "pickup") {
            setPickup(finalAddress);
            setPickupCoords({ lat: selectedLatLng.lat, lng: selectedLatLng.lng });
          } else if (selectingField === "drop") {
            setDrop(finalAddress);
            setDropCoords({ lat: selectedLatLng.lat, lng: selectedLatLng.lng });
          }
        
          setShowMap(false);
          setSelectedLatLng(null);
          setSelectedAddress("");
          setSelectingField(null);
        }}
      >
        Confirm Location
      </button>
    </div>
            
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
const modalStyles = {
  overlay: {
    position: "fixed", // Key for covering the whole screen
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.4)", // Darkens the background slightly
    backdropFilter: "blur(8px)", // Blurs everything behind the modal
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999, // Ensures it is on top of Navbar and Map
  },
  content: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
    textAlign: "center",
    width: "420px",
    maxWidth: "90%",
  },
  button: {
    width: "100%",
    padding: "16px",
    backgroundColor: "#000",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "18px",
    fontWeight: "600",
    cursor: "pointer",
  }
};
export default RiderHome;