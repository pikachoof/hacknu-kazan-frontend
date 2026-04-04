import { BrowserRouter, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/login";
import { Whiteboard } from "./pages/whiteboard";
import { NotFound } from "./pages/notfound";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route index element={<AuthPage />} />
          <Route path="/whiteboard" element={<Whiteboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;