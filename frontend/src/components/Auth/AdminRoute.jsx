import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Spinner } from "react-bootstrap";

const AdminRoute = ({ children }) => {
  const { user, token, loading } = useSelector((state) => state.auth);
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isSuperAdmin = user.roles?.includes('super_admin');
  
  if (!isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default AdminRoute;