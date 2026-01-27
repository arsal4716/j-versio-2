// components/campaignCard.jsx
import React from "react";
import { Card, Button, Form, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const CampaignCard = ({ title, url, colorClass, isEnabled, centerId }) => {
  const navigate = useNavigate();

  const cardClassName = `campaign-card p-4 text-white ${colorClass} ${
    isEnabled ? "enabled" : "disabled"
  }`;

  const handleOpenForm = () => {
    navigate(`/form/${centerId}/${title}`);
  };

  const EnabledButtons = () => (
    <>
      <Button variant="outline-light" className="me-2">
        Customize
      </Button>
      <Button variant="outline-light" className="me-2">
        Outsource
      </Button>
      <Button
        variant="primary"
        disabled={!isEnabled}
        onClick={handleOpenForm}
      >
        Open Form
      </Button>
    </>
  );

  const DisabledButtons = () => (
    <>
      <Button variant="outline-secondary" disabled className="me-2">
        Customize
      </Button>
      <Button variant="outline-secondary" disabled className="me-2">
        Outsource
      </Button>
      <Button variant="primary" onClick={handleOpenForm}>
        Open Form
      </Button>
    </>
  );

  return (
    <Col lg={6} className="mb-4">
      <Card className={cardClassName}>
        <Card.Body className="d-flex flex-column justify-content-between p-3">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <Card.Title className="card-title">{title}</Card.Title>
              <Card.Text className="card-url">{url}</Card.Text>
            </div>

            <Form.Check
              type="switch"
              id={`switch-${title}`}
              checked={isEnabled}
              readOnly
              className="form-switch"
            />
          </div>
          <div className="d-flex mt-3">
            {isEnabled ? <EnabledButtons /> : <DisabledButtons />}
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
};

export default CampaignCard;
