import API_BASE_URL from "../config/api";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "./RideOptions.css";
import L from 'leaflet';

// Map Recenter Sub-component
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.panTo(center, { animate: true, duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

function RideOptions(props) {
  const location = useLocation();

  const pickup = props.pickup || location.state?.pickup;
  const drop = props.drop || location.state?.drop;
  const pickupLat = props.pickupCoords?.lat || location.state?.pickupLat;
  const pickupLng = props.pickupCoords?.lng || location.state?.pickupLng;
  const dropLat = props.dropCoords?.lat || location.state?.dropLat;
  const dropLng = props.dropCoords?.lng || location.state?.dropLng;
  const navigate = useNavigate();
  const [roadDistance, setRoadDistance] = useState(0);
  const [selectedRide, setSelectedRide] = useState("Moto");
  const [isSearching, setIsSearching] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [trackingRoute, setTrackingRoute] = useState([]);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [showRatingScreen, setShowRatingScreen] = useState(false);
  const [driverToRate, setDriverToRate] = useState({ id: null, name: "" });
  const [rating, setRating] = useState(5); 

  // Track completion state cleanly to protect loops
  const currentRequestedRideIdRef = useRef(null);
  const isCompletedRef = useRef(false);

  // Haversine fallback formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getRoadDistance = async (lat1, lon1, lat2, lon2) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes[0].distance / 1000; 
      }
      return calculateDistance(lat1, lon1, lat2, lon2); 
    } catch (error) {
      console.error("Error fetching road distance:", error);
      return calculateDistance(lat1, lon1, lat2, lon2);
    }
  };

  // Distance calculator effect hook
  useEffect(() => {
    const fetchDistance = async () => {
      if (pickupLat && dropLat) {
        const dist = await getRoadDistance(pickupLat, pickupLng, dropLat, dropLng);
        setRoadDistance(dist);
      }
    };
    fetchDistance();
  }, [pickupLat, pickupLng, dropLat, dropLng]);

  // Nearby vehicles generation
  useEffect(() => {
    if (pickupLat && pickupLng) {
      const drivers = Array.from({ length: 5 }).map((_, i) => ({
        id: i,
        lat: pickupLat + (Math.random() - 0.5) * 0.01,
        lng: pickupLng + (Math.random() - 0.5) * 0.01,
      }));
      setNearbyDrivers(drivers);
    }
  }, [pickupLat, pickupLng, selectedRide]);

  // Handle Request Fire
  const handleRideRequest = async () => {
    isCompletedRef.current = false; 
    setActiveRide(null);
    setIsSearching(true);
    const currentRide = rides.find(r => r.id === selectedRide);

    const rideData = {
      pickup_address: pickup,
      drop_address: drop,
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      drop_lat: dropLat,
      drop_lng: dropLng,
      fare_lkr: currentRide?.price || 0
    };

    try {
      const token = localStorage.getItem("token"); 
      const response = await fetch(`${API_BASE_URL}/api/rides/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(rideData),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log("Ride saved to DB:", data.ride);
        if (data.ride && data.ride.id) {
          currentRequestedRideIdRef.current = data.ride.id;
        }
      } else {
        alert("Failed to request ride: " + data.error);
        setIsSearching(false);
      }
    } catch (error) {
      console.error("Network error:", error);
      setIsSearching(false);
    }
  };

  // Cancel current ride posting records
  const handleCancelRide = async () => {
    setIsSearching(false); 
    setActiveRide(null); 
    console.log("Cancelling ride...");

    try {
        const response = await fetch(`${API_BASE_URL}/api/rides/cancel`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json"
            },
        });
        const data = await response.json();
        console.log("Cleanup result:", data);
    } catch (error) {
        console.error("Cleanup error:", error);
    }
  };

  // Real-time tracking route & ETA path calculator
  useEffect(() => {
    if (!activeRide || !activeRide.driver_current_lat || !activeRide.driver_current_lng || activeRide.status === "completed") return;
  
    const getTrackingRouteAndETA = async () => {
      const dLat = parseFloat(activeRide.driver_current_lat);
      const dLng = parseFloat(activeRide.driver_current_lng);
  
      let targetLat = pickupLat;
      let targetLng = pickupLng;
  
      if (activeRide.status === "ongoing") {
        targetLat = dropLat;
        targetLng = dropLng;
      }
  
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${dLng},${dLat};${targetLng},${targetLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
  
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setTrackingRoute(coordinates);
  
          const minutes = Math.ceil(route.duration / 60);
          setEtaMinutes(minutes);
        }
      } catch (err) {
        console.error("Failed tracking path queries:", err);
      }
    };
  
    getTrackingRouteAndETA();
  }, [activeRide?.driver_current_lat, activeRide?.driver_current_lng, activeRide?.status]);

  // Clean up side effect when switching screens
  useEffect(() => {
    return () => {
      if (isSearching) handleCancelRide();
    };
  }, [isSearching]);

// Live Location Sync Polling Effect Loop - FIXED
useEffect(() => {
  let intervalId;

  // 🟢 GUARD 1: Exit immediately if rating screen is active or ref indicates complete
  if (showRatingScreen || isCompletedRef.current) {
    return;
  }

  const fetchRideAndDriverStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/rides/active-ride`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.ride) {
          const backendRideId = data.ride.id || data.ride.ride_id;

          if (isSearching && currentRequestedRideIdRef.current && backendRideId !== currentRequestedRideIdRef.current) {
            console.log("Skipping stale historical database entry. Waiting for driver allocation...");
            return;
          }
          // 🟢 INTERCEPT COMPLETION SECURELY
          if (data.ride.status === "completed" && !isCompletedRef.current && !isSearching) {
            console.log("Ride completion captured successfully!", data.ride);
            isCompletedRef.current = true; 
            if (intervalId) clearInterval(intervalId);  
      
            setDriverToRate({
              id: data.ride.driver_uid, 
              name: data.ride.driver_name || "Your Driver"
            });
            
            setShowRatingScreen(true);
            setActiveRide(data.ride); 
            setIsSearching(false);
          } else if (!isCompletedRef.current) {
            setActiveRide(data.ride); 
            if (data.ride.status !== "pending") {
              setIsSearching(false); 
            }
          }
        } else {
          // 🟢 SAFEGUARD FALLBACK CRITICAL FIX
          // If backend returns null, but we are actively waiting for a match (isSearching is true),
          // DO NOT clear out the states or kill the pulsar effect.
          if (isSearching) {
            console.log("Backend returned no ride yet, keeping pulsar animation spinning...");
            return; 
          }

          if (activeRide && !isCompletedRef.current) {
            if (activeRide.status === "ongoing") {
              console.log("Active ride missing from endpoint payload but was ongoing. Forcing rating layer fallback.");
              isCompletedRef.current = true;
              if (intervalId) clearInterval(intervalId);
              
              setDriverToRate({
                id: activeRide.driver_uid,
                name: activeRide.driver_name || "Your Driver"
              });
              setShowRatingScreen(true);
            } else {
              setActiveRide(null);
              setIsSearching(false);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error syncing driver live location:", error);
    }
  };

  // Only set up interval if we are searching or have an in-progress ride
  if (isSearching || (activeRide && activeRide.status !== "completed")) {
    fetchRideAndDriverStatus();
    intervalId = setInterval(fetchRideAndDriverStatus, 3000);
  }

  return () => {
    if (intervalId) clearInterval(intervalId);
  };
}, [isSearching, activeRide?.status, showRatingScreen]);

  const handleRatingSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/driver/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          driver_id: driverToRate.id,
          rating: rating
        }),
      });
  
      if (response.ok) {
        console.log("Rating saved successfully");
      } else {
        console.error("Failed to save rating down to data layers");
      }
    } catch (error) {
      console.error("Network error submitting driver evaluation:", error);
    } finally {
      // 1. Wipe out booking parameters saved in local storage to break any rendering loops
      localStorage.removeItem("pendingRideIntent");
  
      // 2. Clear all tracking references completely
      isCompletedRef.current = false;
      currentRequestedRideIdRef.current = null;
      setShowRatingScreen(false);
      setActiveRide(null); 
      setDriverToRate({ id: null, name: "" });
      setRating(5);
  
      // 3. Clear location/input states if they are accessible within this component context
      if (typeof setPickup === "function") setPickup("");
      if (typeof setDrop === "function") setDrop("");
  
      // 4. Force route path straight back to clean home view
      // Using replace: true alters window history so clicking "Back" won't bug the UI
      navigate("/", { replace: true });
  
      // 5. Hard reset guarantee: Completely purges residual state trees in memory
      window.location.reload();
    }
  };

  if (!pickupLat || !dropLat) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Setting up ride...</h2>
        <p>Please wait while we calculate your route.</p>
      </div>
    );
  }

  const rates = { Moto: 50, Tuk: 100, Car: 200 };
  
  const rides = [
    { id: "Moto", name: "Moto", price: (roadDistance * rates.Moto).toFixed(2), seats: 1, img: "https://d1a3f4spazzrp4.cloudfront.net/car-types/halo/v1_1/halo_moto.png" },
    { id: "Tuk", name: "Tuk", price: (roadDistance * rates.Tuk).toFixed(2), seats: 3, img: "https://d1a3f4spazzrp4.cloudfront.net/car-types/halo/v1_1/halo_tuktuk.png", faster: true },
    { id: "Zip", name: "Zip", price: (roadDistance * rates.Car).toFixed(2), seats: 4, img: "https://d1a3f4spazzrp4.cloudfront.net/car-types/halo/v1_1/halo_uberx.png" },
  ];

  const pulseIcon = L.divIcon({
    className: 'pulse-icon-container',
    html: `
      <div class="main-dot"></div>
      <div class="pulse-ring ring-1"></div>
      <div class="pulse-ring ring-2"></div>
      <div class="pulse-ring ring-3"></div>
    `,
    iconSize: [20, 20]
  });

  const driverIcon = L.icon({
    iconUrl: rides.find(r => r.id === selectedRide)?.img || 'https://d1a3f4spazzrp4.cloudfront.net/car-types/halo/v1_1/halo_moto.png',
    iconSize: [40, 40],
  });

  // =========================================================================
  // INTERCEPTOR LAYER 1: Post-Trip Driver Rating Screen (HIGHEST PRIORITY)
  // =========================================================================
  if (showRatingScreen) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f3f4f6" }}>
        <Navbar />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
          <div style={{ background: "#ffffff", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", maxWidth: "420px", width: "100%", textAlign: "center" }}>
            
            <div style={{ width: "80px", height: "80px", background: "#f0fdf4", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto 20px" }}>
              <i className="fa-solid fa-square-check" style={{ fontSize: "40px", color: "#16a34a" }}></i>
            </div>

            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#111", margin: "0 0 8px 0" }}>Trip Completed!</h2>
            <p style={{ color: "#666", margin: "0 0 24px 0", fontSize: "15px" }}>
              How was your ride with <strong>{driverToRate.name}</strong>?
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "32px" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <i
                  key={star}
                  className={star <= rating ? "fa-solid fa-star" : "fa-regular fa-star"}
                  style={{ fontSize: "32px", color: "#eab308", cursor: "pointer", transition: "transform 0.1s ease" }}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>

            <button
              style={{ width: "100%", padding: "16px", borderRadius: "8px", background: "#111111", color: "#ffffff", border: "none", fontWeight: "700", fontSize: "16px", cursor: "pointer" }}
              onClick={handleRatingSubmit}
            >
              Submit Feedback
            </button>
            
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // INTERCEPTOR LAYER 2: Active Realtime Tracking Screen (EXCLUDING 'completed')
  // =========================================================================
  if (activeRide && activeRide.status !== "pending" && activeRide.status !== "completed") {
    return (
      <div className="rider-tracking-wrapper" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Navbar />
        <div style={{ display: "flex", flex: 1, height: "calc(100vh - 70px)", overflow: "hidden" }}>
          
          {/* Left Panel */}
          <div style={{ width: "360px", padding: "24px", background: "#ffffff", boxShadow: "4px 0 20px rgba(0,0,0,0.1)", zIndex: 10, display: "flex", flexDirection: "column" }}>
            <div>
              <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#111", margin: "0 0 10px 0" }}>
                {activeRide.status === "accepted" && "Driver is coming!"}
                {activeRide.status === "arrived" && "Driver has arrived!"}
                {activeRide.status === "ongoing" && "Trip is Active"}
              </h2>
              
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "20px" }}>
                <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>
                  Status: {activeRide.status}
                </span>

                {etaMinutes !== null && activeRide.status !== "arrived" && (
                  <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700" }}>
                       ETA: {etaMinutes} mins
                  </span>
                )}
              </div>

              <div style={{ marginTop: "24px", padding: "18px", background: "#f8f9fa", borderRadius: "12px", border: "1px solid #eee" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "18px" }}> {activeRide.driver_name || "Your Assigned Driver"}</h3>
                <p style={{ margin: "0 0 10px 0", color: "#666" }}> {activeRide.driver_phone || "Contact via system"}</p>
                <hr style={{ border: "0", borderTop: "1px solid #eef", margin: "10px 0" }} />
                <p style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "#222" }}>
                  Fare Protection: <span style={{ color: "#16a34a" }}>LKR {activeRide.fare_lkr}</span>
                </p>
              </div>
              
              <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ fontSize: "14px", margin: "0" }}> <strong>Pickup:</strong> {pickup}</p>
                <p style={{ fontSize: "14px", margin: "0" }}> <strong>Drop:</strong> {drop}</p>
              </div>
            </div>

            <button 
              className="cancel-request-btn" 
              style={{ marginTop: "auto", width: "100%", padding: "14px", borderRadius: "8px", background: "#ef4444", color: "#fff", border: "none", fontWeight: "bold", cursor: "pointer" }}
              onClick={handleCancelRide}
            >
              Cancel Trip
            </button>
          </div>

          {/* Right Panel */}
          <div style={{ flex: 1, position: "relative" }}>
            <MapContainer 
              key={`active-map-${activeRide?.driver_current_lat || 'initial'}`}
              center={[pickupLat, pickupLng]} 
              zoom={15} 
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              
              <Marker position={[pickupLat, pickupLng]} /> 
              <Marker position={[dropLat, dropLng]} />

              <MapRecenter center={[
                activeRide.driver_current_lat ? parseFloat(activeRide.driver_current_lat) : pickupLat,
                activeRide.driver_current_lng ? parseFloat(activeRide.driver_current_lng) : pickupLng
              ]} />

              {trackingRoute.length > 0 && (
                <Polyline 
                  positions={trackingRoute} 
                  pathOptions={{ 
                    color: activeRide.status === "ongoing" ? "#3b82f6" : "#10b981", 
                    weight: 5, 
                    opacity: 0.8 
                  }} 
                />
              )}  

              {activeRide?.driver_current_lat && activeRide?.driver_current_lng && (
                <Marker 
                  position={[parseFloat(activeRide.driver_current_lat), parseFloat(activeRide.driver_current_lng)]}
                  icon={L.icon({
                    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png', 
                    iconSize: [35, 35]
                  })}
                >
                  <Popup>{activeRide.driver_name || 'Driver'} is here!</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // STANDARD SELECTION & SEARCHING MARKUP (FALLBACK BASELINE)
  // =========================================================================
  return (
    <div className={`rider-home-wrapper ${isSearching ? "mode-searching" : "mode-selection"}`}>
      <Navbar />
      <div className="rides-container">
      {!isSearching ? (
        <>
        <div className="rides-left">
          <div className="get-a-ride-card">
            <h2>Get a ride</h2>
            <div className="location-container">
              <div className="route-line"></div>
              <div className="location-row">
                <i className="fa-regular fa-circle-dot blue-icon"></i>
                <div className="location-box">{pickup}</div>
              </div>
              <div className="location-row">
                <i className="fa-solid fa-location-dot blue-icon"></i>
                <div className="location-box">{drop}</div>
              </div>
              <p className="dist-label">
                Total Distance: {roadDistance > 0 ? roadDistance.toFixed(2) : "Calculating..."} km
              </p>
            </div>
          </div>
        </div>

        <div className="rides-center">
          <h1>Choose a ride</h1>
          <p className="sub-heading">Rides we think you'll like</p>
          <div className="ride-list">
            {rides.map((ride) => (
              <div 
                key={ride.id} 
                className={`ride-option-card ${selectedRide === ride.id ? "selected" : ""}`}
                onClick={() => setSelectedRide(ride.id)}
              >
                <img src={ride.img} alt={ride.name} className="vehicle-img" />
                <div className="ride-info">
                  <div className="ride-header">
                    <span className="ride-name">{ride.name} 👤{ride.seats}</span>
                    <span className="ride-price">LKR {ride.price}</span>
                  </div>
                  {ride.faster && <span className="faster-badge">⚡ Faster</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="request-bar">
            <div className="payment-method">Cash</div>
            <button className="request-confirm-btn" onClick={handleRideRequest}>
              Request {selectedRide}
            </button>
          </div>
        </div>
        </>
        ) : (
          <div className="searching-panel">
            <div className="searching-content">
              <h2>Searching for {selectedRide}s...</h2>
              <div className="loading-dots">
                <span></span><span></span><span></span>
              </div>
              
              <div className="request-details-card">
                <div className="location-row small">
                  <i className="fa-regular fa-circle-dot blue-icon"></i>
                  <span>{pickup}</span>
                </div>
                <div className="location-row small">
                  <i className="fa-solid fa-location-dot blue-icon"></i>
                  <span>{drop}</span>
                </div>
                <div className="selected-vehicle-summary">
                  <img src={rides.find(r => r.id === selectedRide)?.img} alt="" />
                  <p>{selectedRide} • LKR {rides.find(r => r.id === selectedRide)?.price}</p>
                </div>
              </div>
              <button 
                className="cancel-request-btn" 
                onClick={handleCancelRide}
              >
                Cancel Request
              </button>
            </div>
          </div>
        )}

        <div className="rides-right">
          <MapContainer
            key={`selection-map-${pickupLat}`}
            center={[pickupLat || 6.9271, pickupLng || 79.8612]}
            zoom={15}
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {isSearching ? (
              <Marker position={[pickupLat, pickupLng]} icon={pulseIcon} />
            ) : (
              <Marker position={[pickupLat, pickupLng]} />
            )}
            <Marker position={[dropLat, dropLng]} />

            {nearbyDrivers.map(driver => (
              <Marker 
                key={driver.id} 
                position={[driver.lat, driver.lng]} 
                icon={driverIcon} 
              />
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default RideOptions;