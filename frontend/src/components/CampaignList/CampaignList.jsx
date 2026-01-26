import React, { useEffect, useState } from "react";
import { Container, Row, Col, Button, Spinner } from "react-bootstrap";
import CampaignCard from "../CampaignCard/CampaignCard";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";

const CampaignList = () => {
  const { user, allowedCampaigns } = useSelector((state) => state.auth);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedCampaigns =
      allowedCampaigns?.length > 0
        ? allowedCampaigns
        : JSON.parse(localStorage.getItem("allowedCampaigns")) || [];

    setCampaigns(storedCampaigns);
    setLoading(false);
  }, [allowedCampaigns]);

  return (
    <Container className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="fw-normal mb-0">
            Good Morning, {user?.name || "Center"}
          </h2>
        </Col>
        <Col xs="auto">
          <Button
            variant="primary"
            className="rounded-pill px-4 py-2 fw-medium shadow-sm"
            style={{ backgroundColor: "#5e3bee", borderColor: "#5e3bee" }}
          >
            <Plus size={18} className="me-1" /> Add Campaign
          </Button>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : campaigns.length === 0 ? (
        <p className="text-center text-muted">No campaigns found.</p>
      ) : (
        <Row className="g-4">
          {campaigns.map((campaign, index) => (
            <CampaignCard
              key={index}
              title={campaign}
              centerId={user?.centerId}
              url={
                campaign === "ACA"
                  ? ""
                  : campaign === "MVA"
                  ? ""
                  : ""
              }
              colorClass={
                campaign === "ACA"
                  ? "bg-gradient-purple-blue"
                  : campaign === "MVA"
                  ? "bg-gradient-pink-red"
                  : "bg-dark-gray"
              }
              isEnabled={true}
            />
          ))}
        </Row>
      )}
    </Container>
  );
};

export default CampaignList;
