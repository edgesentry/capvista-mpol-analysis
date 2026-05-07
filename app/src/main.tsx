import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AdminPage from "./pages/AdminPage";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element");

const isAdmin = window.location.pathname === "/admin" || window.location.pathname === "/admin/";

createRoot(root).render(
  <StrictMode>
    {isAdmin ? <AdminPage /> : <App />}
  </StrictMode>
);
