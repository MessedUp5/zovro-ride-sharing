import React, { useState, useEffect } from 'react';
import Navbar from "../components/Navbar";
import RoutingMachine from "../components/RoutingMachine";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "./DriverHome.css";
import L from "leaflet";
import "leaflet-routing-machine"; 

function DriverHome() {
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRide, setIncomingRide] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [driverCoords, setDriverCoords] = useState(null);
  const [activeRide, setActiveRide] = useState(null);

  // Load User Data
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setCurrentUser(storedUser);
      console.log("Logged in Driver UID:", storedUser.uid || storedUser.id);
    }
  }, []);

  // Watch Location when driver goes online
  // Watch Location when driver goes online
useEffect(() => {
  let watchId;

  if (isOnline) {
    watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setDriverCoords({ lat: latitude, lng: longitude });
        
        console.log("Moving to:", latitude, longitude);

        // FIX: Route general updates to the profile tracker, leaving trip-location alone
        try {
          await fetch('https://zovro-ride-sharing.vercel.app/api/rides/update-driver-profile-location', {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ lat: latitude, lng: longitude })
          });
        } catch (err) {
          console.error("Failed to stream global profile location:", err);
        }
      },
      (err) => console.error("Position Error:", err),
      { enableHighAccuracy: true, distanceFilter: 10 }
    );
  }

  return () => {
    if (watchId) navigator.geolocation.clearWatch(watchId);
  };
}, [isOnline]);

  // Stream Location From the Driver's App while explicitly on an active ride
  useEffect(() => {
    // FIX 2: Changed activeRide.ride_id to activeRide.id to match the DB schema layout
    if (!activeRide || !activeRide.id) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          await fetch("https://zovro-ride-sharing.vercel.app/api/rides/update-trip-location", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({
              ride_id: activeRide.id, // FIX 3: Sending DB-compliant id mapped to ride_id param
              lat: latitude,
              lng: longitude
            })
          });
          console.log(`Location streamed to trip row: ${latitude}, ${longitude}`);
        } catch (err) {
          console.error("Failed to stream location to backend:", err);
        }
      },
      (err) => console.error("Error getting GPS coordinates:", err),
      { enableHighAccuracy: true, distanceFilter: 10 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeRide]);

  // Poll for nearby incoming matching rides
  useEffect(() => {
    const pollForRides = async () => {
      if (!isOnline || !driverCoords || activeRide) return; 
    
      try {
        const url = `https://zovro-ride-sharing.vercel.app/api/rides/pending?lat=${driverCoords.lat}&lng=${driverCoords.lng}`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        });
    
        if (response.ok) {
          const data = await response.json();
          setIncomingRide(data.length > 0 ? data[0] : null);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };
  
    const interval = setInterval(pollForRides, 3000);
    return () => clearInterval(interval);
  }, [isOnline, driverCoords, activeRide]);

// Handle Accepting Ride Request
const handleAccept = async () => {
  // FIX: Support both standard id naming variants flexibly
  const realRideId = incomingRide?.ride_id || incomingRide?.id;
  
  if (!incomingRide || !realRideId || !currentUser) {
    console.error("Cannot accept ride: Missing ride data or user profile context.");
    return;
  }
  
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("Driver authentication token missing.");
      return;
    }
  
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
  
      // Targets the dynamic ride ID value extracted safely above
      const response = await fetch(`https://zovro-ride-sharing.vercel.app/api/rides/status/${realRideId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          status: "accepted",
          lat: latitude,  
          lng: longitude  
        }),
      });
      
      const data = await response.json();
  
      if (response.ok) {
        console.log("Ride setup resolved successfully:", data);
        
        const verifiedRideData = data.ride || data;
        
        // Build a robust active ride state object
        const stableRideObject = {
          ...incomingRide,
          ...verifiedRideData,
          id: realRideId,
          ride_id: realRideId,
          status: "accepted"
        };
        
        setActiveRide(stableRideObject); 
        setIncomingRide(null); // Dismiss the request popup cleanly
      } else {
        console.error("Server rejected assignment:", data.error);
        alert(`Server error processing accept request: ${data.error || "Unknown Error"}`);
      }
    }, (geoErr) => {
      console.error("Geolocation verification breakdown:", geoErr);
      alert("Please ensure device location services are turned on to accept incoming requests.");
    }, { enableHighAccuracy: true });
  
  } catch (err) {
    console.error("Network processing failure:", err);
  }
};

  // Update live progression status steps ('arrived', 'ongoing', 'completed')
  const updateRideProgression = async (nextStatus) => {
    if (!activeRide || !activeRide.id) return;

    try {
      // FIX 6: Target path modified to track against activeRide.id
      const response = await fetch(`https://zovro-ride-sharing.vercel.app/api/rides/status/${activeRide.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await response.json();

      if (response.ok) {
        if (nextStatus === "completed") {
          alert("Trip completed successfully!");
          setActiveRide(null); 
        } else {
          setActiveRide(data.ride); 
        }
      } else {
        alert("Failed to update status step: " + data.error);
      }
    } catch (err) {
      console.error("Failed progression step change:", err);
    }
  };

  const toggleStatus = () => {
    setIsOnline(!isOnline);
    setIncomingRide(null);
  };

  const getStatusButtonConfig = () => {
    if (!activeRide) return null;
    switch (activeRide.status) {
      case "accepted":
        return { text: "I have Arrived", next: "arrived" };
      case "arrived":
        return { text: "Start Trip", next: "ongoing" };
      case "ongoing":
        return { text: "Complete Trip", next: "completed" };
      default:
        return null;
    }
  };

  const buttonConfig = getStatusButtonConfig();

  return (
    <div className="driver-dashboard">
      <Navbar />
      <div className="content-wrapper">
        {!activeRide ? (
          <>
            <div className={`status-bar ${isOnline ? "online" : "offline"}`}>
              <span className="status-text">
                {isOnline ? "● You are Online" : "○ You are Offline"}
              </span>
              <button className="toggle-btn" onClick={toggleStatus}>
                {isOnline ? "Go Offline" : "Go Online"}
              </button>
            </div>

            <div className="driver-layout">
              <div className="stats-panel">
                <h2 className="stats-title">Today's Earnings</h2>
                <h1 className="earnings-amount">LKR 4,500.00</h1>
                <hr className="divider" />
                <div className="stats-info">
                  <p>Rides Completed: <strong>8</strong></p>
                  <p>Rating: <span className="star">⭐</span> <strong>4.9</strong></p>
                </div>
              </div>

              <div className="map-view">
                <MapContainer 
                  center={driverCoords ? [driverCoords.lat, driverCoords.lng] : [6.9271, 79.8612]} 
                  zoom={14} 
                  key={driverCoords ? `map-${driverCoords.lat}` : 'default'}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {driverCoords && (
                    <Marker position={[driverCoords.lat, driverCoords.lng]}>
                      <Popup>You are currently here.</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="active-ride-layout">
            <div className="ride-details-sidebar">
              <h2>
                {activeRide.status === "accepted" && "Heading to Pickup"}
                {activeRide.status === "arrived" && "Driver has Arrived"}
                {activeRide.status === "ongoing" && "Trip in Progress"}
              </h2>
              <div className="detail-card">
                <p><strong>Passenger Pickup:</strong></p>
                <p>{activeRide.pickup_address}</p>
                <hr />
                <p><strong>Destination:</strong></p>
                <p>{activeRide.drop_address}</p>
              </div>
              
              {buttonConfig && (
                <button 
                  className={`arrived-btn ${activeRide.status}`} 
                  onClick={() => updateRideProgression(buttonConfig.next)}
                >
                  {buttonConfig.text}
                </button>
              )}
            </div>

            <div className="navigation-map">
              <MapContainer 
                center={driverCoords ? [driverCoords.lat, driverCoords.lng] : [6.9271, 79.8612]} 
                zoom={16}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {driverCoords && (
                  <RoutingMachine 
                    userPos={driverCoords} 
                    targetPos={
                      activeRide.status === "ongoing" 
                        ? { lat: activeRide.drop_lat, lng: activeRide.drop_lng }
                        : { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng }
                    } 
                  />
                )}

                {driverCoords && <Marker position={[driverCoords.lat, driverCoords.lng]} />}
                <Marker position={[activeRide.pickup_lat, activeRide.pickup_lng]} />
              </MapContainer>
            </div>
          </div>
        )}
      </div>

      {incomingRide && (
        <div className="ride-request-modal">
          <div className="modal-content">
            <h2>Incoming Ride Request!</h2>
            <p><strong>Pickup:</strong> {incomingRide.pickup_address}</p>
            <p><strong>Drop:</strong> {incomingRide.drop_address}</p>
            <p><strong>Fare:</strong> LKR {incomingRide.fare_lkr}</p>
            <div className="modal-actions">
              <button className="accept-btn" onClick={handleAccept}>Accept Ride</button>
              <button className="decline-btn" onClick={() => setIncomingRide(null)}>Decline</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DriverHome;