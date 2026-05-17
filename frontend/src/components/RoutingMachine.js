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
        styles: [{ color: "#007bff", weight: 6 }] // Uber-style blue line
      },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false, // Hide the text instructions box
    }).addTo(map);

    return () => map.removeControl(routingControl);
  }, [map, userPos, targetPos]); // Re-draws line when driver moves

  return null;
}

export default RoutingMachine;