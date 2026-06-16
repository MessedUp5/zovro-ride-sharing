import API_BASE_URL from "../config/api";
import React, { useState, useEffect } from 'react';

import Navbar from "../components/Navbar";
import RoutingMachine from "../components/RoutingMachine";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "./DriverHome.css";
import L from "leaflet";
import "leaflet-routing-machine"; 

// 🟢 HELPER SUB-COMPONENT: Fixes mobile aspect shifts, handles smooth tracking & prevents blank layouts
function DriverMapRecalibrator({ coordinates, status }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;

    // Recalculate dimensions for mobile aspect views
    const timer = setTimeout(() => {
      map.invalidateSize({ animate: true });
    }, 200);

    return () => clearTimeout(timer);
  }, [map, status]);

  useEffect(() => {
    // Smoothly follow the driver's pin without remounting the layout
    if (map && coordinates) {
      map.setView([coordinates.lat, coordinates.lng], map.getZoom());
    }
  }, [map, coordinates]);

  return null;
}

function DriverHome() {
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRide, setIncomingRide] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [driverCoords, setDriverCoords] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [isProcessingAccept, setIsProcessingAccept] = useState(false);

  // Load User Data
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setCurrentUser(storedUser);
      console.log("Logged in Driver UID:", storedUser.uid || storedUser.id);
    }
  }, []);

  // Watch Location when driver goes online
  useEffect(() => {
    let watchId;

    if (isOnline) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setDriverCoords({ lat: latitude, lng: longitude });
          
          console.log("Moving to:", latitude, longitude);

          try {
            await fetch(`${API_BASE_URL}/api/rides/update-driver-profile-location`, {
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
        { enableHighAccuracy: true, 
          timeout: 5000, 
          maximumAge: 0 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isOnline]);

  // Stream Location From the Driver's App while explicitly on an active ride
  useEffect(() => {
    if (!activeRide || !activeRide.id) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          await fetch(`${API_BASE_URL}/api/rides/update-trip-location`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({
              ride_id: activeRide.id, 
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
      if (!isOnline || !driverCoords || activeRide || isProcessingAccept) return; 
    
      try {
        const url = `${API_BASE_URL}/api/rides/pending?lat=${driverCoords.lat}&lng=${driverCoords.lng}`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        });
    
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0 && !activeRide && !isProcessingAccept) {
            setIncomingRide(data[0]);
          } else {
            setIncomingRide(null);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };
  
    const interval = setInterval(pollForRides, 3000);
    return () => clearInterval(interval);
  }, [isOnline, driverCoords, activeRide, isProcessingAccept]);

  // Handle Accepting Ride Request
  const handleAccept = async () => {
    const realRideId = incomingRide?.ride_id || incomingRide?.id;
    
    if (!incomingRide || !realRideId || !currentUser) {
      console.error("Cannot accept ride: Missing ride data or user profile context.");
      return;
    }
    
    setIsProcessingAccept(true);
    setIncomingRide(null); 
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsProcessingAccept(false);
        return;
      }

      const latitude = driverCoords?.lat || 6.9271; 
      const longitude = driverCoords?.lng || 79.8612;

      const response = await fetch(`${API_BASE_URL}/api/rides/status/${realRideId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          status: "accepted",
          lat: latitude,  
          lng: longitude,
          driver_uid: currentUser?.uid || currentUser?.id || currentUser?.firebase_uid
        }),
      });
      
      const data = await response.json();

      if (response.ok) {
        console.log("Ride setup resolved successfully:", data);
        const verifiedRideData = data.ride || data;
        
        const stableRideObject = {
          ...incomingRide,
          ...verifiedRideData,
          id: realRideId,
          ride_id: realRideId,
          status: "accepted"
        };
        
        setActiveRide(stableRideObject); 
      } else {
        console.error("Server rejected assignment:", data.error);
        alert(`Server error processing accept request: ${data.error || "Unknown Error"}`);
      }
    
    } catch (err) {
      console.error("Network processing failure:", err);
    } finally {
      setIsProcessingAccept(false);
    }
  };

  // Update live progression status steps ('arrived', 'ongoing', 'completed')
  const updateRideProgression = async (nextStatus) => {
    if (!activeRide || !activeRide.id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/rides/status/${activeRide.id}`, {
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
          console.log("Trip marked as completed in DB.");
          setActiveRide(null); 
          setIncomingRide(null);
        } else {
          const synchronizedRide = data.ride || data;
          setActiveRide({
            ...activeRide,
            ...synchronizedRide,
            id: activeRide.id
          }); 
        }
      } else {
        console.error("Failed to update status step:", data.error);
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
          <div className="driver-layout">
            <div className={`status-bar ${isOnline ? "online" : "offline"}`}>
              <span className="status-text">
                {isOnline ? "● Online" : "○ Offline"}
              </span>
              <button className="toggle-btn" onClick={toggleStatus}>
                {isOnline ? "Go Offline" : "Go Online"}
              </button>
            </div>

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
              {/* 🟢 FIXED: Removed the dynamic driverCoords key that caused remount destruction loop */}
              <MapContainer 
                center={driverCoords ? [driverCoords.lat, driverCoords.lng] : [6.9271, 79.8612]} 
                zoom={14} 
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {/* Automatically repositions and prevents mobile sizing flaws without flashes */}
                <DriverMapRecalibrator coordinates={driverCoords} status={isOnline} />

                {driverCoords && (
                  <Marker position={[driverCoords.lat, driverCoords.lng]}>
                    <Popup>You are currently here.</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>
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
              {driverCoords && 
               !isNaN(parseFloat(activeRide.pickup_lat)) && 
               !isNaN(parseFloat(activeRide.pickup_lng)) ? (
                
                <MapContainer 
                  center={[driverCoords.lat, driverCoords.lng]} 
                  zoom={16}
                  key={`active-map-${activeRide.id}`} // FIXED: Removed activeRide.status from key to prevent map resetting between step toggles
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  
                  <DriverMapRecalibrator coordinates={driverCoords} status={activeRide.status} />

                  <RoutingMachine 
                    userPos={driverCoords} 
                    targetPos={
                      activeRide.status === "ongoing" 
                        ? { lat: parseFloat(activeRide.drop_lat), lng: parseFloat(activeRide.drop_lng) }
                        : { lat: parseFloat(activeRide.pickup_lat), lng: parseFloat(activeRide.pickup_lng) }
                    } 
                  />

                  <Marker position={[driverCoords.lat, driverCoords.lng]} />
                  <Marker position={[parseFloat(activeRide.pickup_lat), parseFloat(activeRide.pickup_lng)]} />
                </MapContainer>
                
              ) : (
                <div className="map-loading-placeholder">
                  <p>Initializing live routing engine maps...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {incomingRide && !activeRide && (
        <div className="ride-request-modal">
          <div className="modal-content">
            <h2>Incoming Ride Request!</h2>
            <div className="modal-body-details">
              <p><strong>Pickup:</strong> {incomingRide.pickup_address}</p>
              <p><strong>Drop:</strong> {incomingRide.drop_address}</p>
              <p className="modal-fare"><strong>Fare:</strong> LKR {incomingRide.fare_lkr}</p>
            </div>
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