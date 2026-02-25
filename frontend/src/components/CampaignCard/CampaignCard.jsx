import React from "react";
import { Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "./CampaignCard.css";

const CampaignCard = ({
  title,
  url,
  variant = "disabled", 
  isEnabled,
  onToggle, 
  centerId,
}) => {
  const navigate = useNavigate();

  const handleOpenForm = () => {
    navigate(`/form/${centerId}/${title}`);
  };

  return (
    <Col lg={6} className="mb-4">
      <div
        className={[
          "campaign-card",
          `card-${variant}`,
          !isEnabled ? "card-disabled" : "",
        ].join(" ")}
      >
        <div className="card-top">
          <div className="card-info">
            <div className="card-title">{title}</div>
            <div className="card-subtitle">{url || ""}</div>
          </div>

          <div className="toggle-wrapper">
            <input
              type="checkbox"
              className="toggle"
              checked={!!isEnabled}
              onChange={(e) => onToggle?.(e.target.checked)}
            />
          </div>
        </div>

        <div className="card-actions">
          <button className="btn btn-customize" disabled={!isEnabled}>
            Customize
          </button>
          <button className="btn btn-outsource" disabled={!isEnabled}>
            Outsource
          </button>
          <button className="btn btn-open" disabled={!isEnabled} onClick={handleOpenForm}>
            Open Form
          </button>
        </div>
      </div>
    </Col>
  );
};

export default CampaignCard;