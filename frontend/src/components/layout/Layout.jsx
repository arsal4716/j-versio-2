import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import bgVideo from "/bg1.mp4"; 
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import "./Layout.css";

const Layout = ({ children }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  
  const isAdminRoute = location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/centers') ||
    location.pathname.startsWith('/form-setup') ||
    location.pathname.startsWith('/users') ||
    location.pathname.startsWith('/settings');

  const showVideoBg = !isAdminRoute && 
    ['/', '/login', '/signup', '/campaign-list', '/form/'].some(path => 
      location.pathname === path || location.pathname.startsWith('/form/')
    );

  const isSuperAdmin = user?.roles?.includes('super_admin');
  const showSidebar = isAdminRoute && isSuperAdmin;

  return (
    <div className="layout-wrapper">
      {/* Video Background for public routes */}
      {showVideoBg && (
        <div className="video-background">
          <video autoPlay muted loop playsInline className="background-video">
            <source src={bgVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="video-overlay"></div>
        </div>
      )}

      {/* Header - Show always */}
      <Header />

      {/* Sidebar - Only for super_admin routes */}
      {showSidebar && <Sidebar />}

      {/* Main Content */}
      <main className={showSidebar ? "ps-lg-250" : ""}>
        <div className="container-fluid py-4">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;