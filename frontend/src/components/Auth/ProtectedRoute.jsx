import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Spinner } from "react-bootstrap";

const ProtectedRoute = ({ children, roles }) => {
  const { user, token, loading } = useSelector((state) => state.auth);
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "50vh" }}
      >
        <Spinner animation="border" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles?.length) {
    const userRoles = Array.isArray(user?.roles)
      ? user.roles
      : user?.role
        ? [user.role]
        : [];

    if (!roles.some((r) => userRoles.includes(r))) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
