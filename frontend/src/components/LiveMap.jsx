import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

const socket = io("https://zovro-ride-sharing.vercel.app/");

function LiveMap() {
  const [driverPosition, setDriverPosition] = useState([6.9271, 79.8612]);
  const [riderPosition] = useState([6.9271, 79.8612]);

  useEffect(() => {
    const handleDriverMove = (data) => {
      setDriverPosition([data.latitude, data.longitude]);
    };

    socket.on("driver_moved", handleDriverMove);

    return () => {
      socket.off("driver_moved", handleDriverMove);
    };
  }, []);

  return (
    <MapContainer
      center={riderPosition}
      zoom={13}
      style={{ height: "500px", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <Marker position={riderPosition} />
      <Marker position={driverPosition} />

      <Polyline positions={[riderPosition, driverPosition]} />
    </MapContainer>
  );
}

export default LiveMap;