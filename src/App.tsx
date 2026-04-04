import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/login";
import WhiteboardPage from "./pages/whiteboard";

export default function App() {
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
