import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RiderHome from "./pages/RiderHome";
import RideOptions from "./pages/RideOptions";
import DriverHome from "./pages/DriverHome"; 
import SignupMobile from "./pages/SignupMobile";
import Login from "./pages/Login";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RiderHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup-mobile" element={<SignupMobile />} />
        <Route path="/rider-home" element={<RiderHome />} />
        <Route path="/ride-options" element={<RideOptions />} />
        <Route path="/rides" element={<RideOptions />} />
        <Route path="/driver-home" element={<DriverHome />} />
        <Route path="/driver" element={<DriverHome />} /> 
      </Routes>
    </Router>
  );
}

export default App;