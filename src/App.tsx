import AuthPage from "./pages/login";
import Whiteboard from "./pages/whiteboard";
import { NotFound } from "./pages/notfound";
// import { AuthGuard } from "./components/AuthGuard";

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import WhiteboardPage from "./pages/whiteboard";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/whiteboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/whiteboard" element={<WhiteboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}
