import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Form, Button, Badge } from "react-bootstrap";
import { Settings as SettingsIcon, Sliders } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { getCenters } from "../../../store/slices/centerSlice";
import SettingsModal from "../../../components/Settings/SettingsModal";

// Super-admin settings hub: adjust a center's DEFAULT settings, or override the
// settings for any single campaign in that center. Reuses the SettingsModal.
const SettingsPage = () => {
  const dispatch = useDispatch();
  const { centers } = useSelector((s) => s.centers);

  const [centerId, setCenterId] = useState("");
  const [modal, setModal] = useState(null); // { centerId, campaignName }

  useEffect(() => {
    dispatch(getCenters());
  }, [dispatch]);

  const selectedCenter = useMemo(
    () => (centers || []).find((c) => c._id === centerId) || null,
    [centers, centerId]
  );

  const campaigns = (selectedCenter?.campaigns || []).filter((c) => c?.isActive !== false);

  return (
    <Container fluid className="py-4">
      <div className="d-flex align-items-center gap-2 mb-1 mt-4">
        <SettingsIcon size={24} />
        <h3 className="mb-0">Settings</h3>
      </div>
      <p className="text-muted">
        Choose a center to manage its default automation settings, or override
        the settings for an individual campaign.
      </p>

      <Card className="mb-4">
        <Card.Body>
          <Form.Group style={{ maxWidth: 420 }}>
            <Form.Label className="fw-semibold">Center</Form.Label>
            <Form.Select value={centerId} onChange={(e) => setCenterId(e.target.value)}>
              <option value="">Select a center…</option>
              {(centers || []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Card.Body>
      </Card>

      {selectedCenter && (
        <>
          <Card className="mb-4">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Center Default Settings</strong>
                <div className="text-muted small">
                  Applies to every campaign in {selectedCenter.name} unless overridden.
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => setModal({ centerId, campaignName: null })}
              >
                <Sliders size={16} className="me-2" />
                Edit Defaults
              </Button>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <strong>Campaign Overrides</strong>
            </Card.Header>
            <Card.Body>
              {campaigns.length === 0 ? (
                <div className="text-muted">No active campaigns in this center.</div>
              ) : (
                <Row className="g-3">
                  {campaigns.map((c) => (
                    <Col md={4} key={c._id || c.name}>
                      <Card className="h-100">
                        <Card.Body className="d-flex justify-content-between align-items-center">
                          <Badge bg="info">{c.name}</Badge>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => setModal({ centerId, campaignName: c.name })}
                          >
                            Customize
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      <SettingsModal
        show={!!modal}
        onHide={() => setModal(null)}
        centerId={modal?.centerId}
        campaignName={modal?.campaignName ?? null}
      />
    </Container>
  );
};

export default SettingsPage;
