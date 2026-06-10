import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Button, Spinner } from "react-bootstrap";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import CampaignCard from "../CampaignCard/CampaignCard";

const CampaignList = () => {
  const { user, allowedCampaigns } = useSelector((state) => state.auth);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const variantFor = (name = "") => {
    const n = name.toLowerCase();
    if (n.includes("medicare")) return "medicare";
    if (n.includes("final")) return "final-expense";
    if (n.includes("mva")) return "mva";
    if (n.includes("aca")) return "aca";
    return "disabled";
  };

  useEffect(() => {
    const storedCampaigns =
      allowedCampaigns?.length > 0
        ? allowedCampaigns
        : JSON.parse(localStorage.getItem("allowedCampaigns")) || [];

    // Normalize: support strings OR objects from API
    const normalized = storedCampaigns.map((c) => {
      if (typeof c === "string") {
        return { name: c, url: "", isEnabled: true };
      }
      return {
        name: c?.name ?? c?.title ?? "",
        url: c?.url ?? c?.website ?? "",
        isEnabled: c?.isEnabled ?? c?.enabled ?? true,
      };
    });

    setCampaigns(normalized);
    setLoading(false);
  }, [allowedCampaigns]);

  const onToggleCampaign = (idx, nextValue) => {
    setCampaigns((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], isEnabled: nextValue };
      return copy;
    });
  };

  return (
    <Container className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="fw-normal mb-0" style={{ fontFamily: "Poppins, sans-serif" }}>
            Welcome, {user?.name || "Center"}
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
              key={`${campaign.name}-${index}`}
              title={campaign.name}
              url={campaign.url}
              variant={variantFor(campaign.name)}
              isEnabled={campaign.isEnabled}
              onToggle={(v) => onToggleCampaign(index, v)}
              centerId={user?.centerId}
            />
          ))}
        </Row>
      )}
    </Container>
  );
};

export default CampaignList;