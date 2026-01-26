import React from "react";
import { Card, Row, Col, Form, InputGroup } from "react-bootstrap";
import { Search, Filter } from "lucide-react";
import { Button } from "react-bootstrap";

const FormSetupFilters = ({
  searchTerm,
  onSearchChange,
  centers,
  selectedCenter,
  onCenterChange,
  campaigns,
  selectedCampaign,
  onCampaignChange,
  loadingCenters,
  loadingCampaigns,
}) => {
  return (
    <Card className="mb-4">
      <Card.Body>
        <Row className="g-3">
          <Col md={3}>
            <Form.Group>
              <Form.Label>Search</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <Search size={18} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search centers..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </InputGroup>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group>
              <Form.Label>Select Center</Form.Label>
              <Form.Select
                key={selectedCenter}
                onChange={onCenterChange}
                disabled={loadingCenters}
              >
                <option value="">All Centers</option>
                {centers.map((center) => (
                  <option key={center._id} value={center._id}>
                    {center.name} ({center.verificationCode})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group>
              <Form.Label>Select Campaign</Form.Label>
              <Form.Select
                value={selectedCampaign}
                onChange={onCampaignChange}
                disabled={!selectedCenter || loadingCampaigns}
              >
                <option value="">All Campaigns</option>
                {campaigns.map((campaign) => (
                  <option key={campaign._id} value={campaign.name}>
                    {campaign.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={1} className="d-flex align-items-end">
            <Button variant="outline-primary" className="w-100">
              <Filter size={18} />
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default FormSetupFilters;
