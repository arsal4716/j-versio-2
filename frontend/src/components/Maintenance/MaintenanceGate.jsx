import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { maintenanceService } from "../../services/maintenanceService";
import MaintenancePage from "./MaintenancePage";

const POLL_MS = 30000;

// Wraps the app. When a super_admin has enabled maintenance mode, everyone
// EXCEPT super_admins sees the maintenance page. The /login route is always
// reachable so a super_admin can sign in and turn it off.
const MaintenanceGate = ({ children }) => {
  const { user } = useSelector((s) => s.auth);
  const location = useLocation();
  const isSuperAdmin = Array.isArray(user?.roles) && user.roles.includes("super_admin");

  const [status, setStatus] = useState({ active: false, until: null, message: "" });
  // Gate the first paint on the initial check so a maintenance-active visitor
  // never sees the app flash before the maintenance page.
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    maintenanceService
      .get()
      .then((res) => setStatus(res?.data?.data || { active: false }))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const onLoginPage = location.pathname === "/login";

  // Until the first status arrives, render nothing (avoids the app→maintenance
  // flicker). The check is a tiny public request, so this is a brief blank.
  if (!loaded) return null;

  if (status.active && !isSuperAdmin && !onLoginPage) {
    return <MaintenancePage until={status.until} message={status.message} onElapsed={refresh} />;
  }

  return children;
};

export default MaintenanceGate;
