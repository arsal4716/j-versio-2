import React from "react";

const LeftPanel = () => {
  return (
    <div 
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: "#001a66",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding:"20px",
        border: "3px solid white",
        borderRadius:"10px"
      }}
    >
      <video 
        autoPlay 
        muted 
        loop 
        playsInline 
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.2,
          zIndex: 0,
          borderRadius:"15px"
        }}
      >
        <source src="/AuthVideo.mp4" type="video/mp4" />
      </video>
      <div style={{ position: "relative", zIndex: 1, padding: "20px" }}>
        <h6 style={{ color: "#fff", fontSize: "14px", marginBottom: "10px" }}>
          Truform is true compliance
        </h6>
        <h2 style={{ color: "#fff", fontWeight: "thin" }}>
          Compliance Made for Call Centers
        </h2>
      </div>
    </div>
  );
};

export default LeftPanel;
