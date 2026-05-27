import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";

function RoutingMachine({ userPos, targetPos }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !userPos || !targetPos) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(userPos.lat, userPos.lng),
        L.latLng(targetPos.lat, targetPos.lng)
      ],
      lineOptions: {
        styles: [{ color: "#007bff", weight: 6 }] 
      },
      addWaypoints: false,
      draggableWaypoints: false,
      
      // 🟢 CHANGE THIS TO FALSE
      fitSelectedRoutes: false, 
      
      show: false, 
    }).addTo(map);

    return () => {
      if (map && routingControl) {
        map.removeControl(routingControl);
      }
    };
  }, [map, userPos, targetPos]); 

  // 🟢 OPTIONAL ADDITION: Manually center the map smoothly ONCE on initial load 
  // without locking the camera frame during progression updates
  useEffect(() => {
    if (map && userPos) {
      map.panTo([userPos.lat, userPos.lng]);
    }
  }, [map]); // Notice this ONLY runs once when the map mounts!

  return null;
}

export default RoutingMachine;