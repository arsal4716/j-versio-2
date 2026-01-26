import React from "react";
import LeftPanel from "./LeftPanel";

const AuthWrapper = ({ children }) => {
  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "800px",
          maxWidth: "95%",
          minHeight: "400px",
          background: "#fff",
          borderRadius: "12px",
          marginTop: "50px",
          overflow: "hidden",
          boxShadow: "0px 8px 20px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ flex: 1, minWidth: "50%" }}>
          <LeftPanel />
        </div>

        <div
          style={{
            flex: 1,
            padding: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: "350px" }}>{children}</div>
        </div>
      </div>
    </div>
  );
};

export default AuthWrapper;
