import React, { useEffect, useState } from "react";
import { Card, Form, Button, Row, Col, Badge } from "react-bootstrap";
import { maintenanceService } from "../../services/maintenanceService";
import { showToast } from "../../utils/Notifications";

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time.
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Super-admin control for global maintenance mode.
const MaintenanceControl = () => {
  const [enabled, setEnabled] = useState(false);
  const [until, setUntil] = useState("");
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    maintenanceService
      .get()
      .then((res) => {
        const d = res?.data?.data || {};
        setEnabled(!!d.enabled);
        setUntil(toLocalInput(d.until));
        setMessage(d.message || "");
        setActive(!!d.active);
      })
      .catch(() => {});
  };
  useEffect(() => {
    load();
  }, []);

  const save = async (nextEnabled) => {
    setSaving(true);
    try {
      const payload = {
        enabled: nextEnabled,
        until: nextEnabled && until ? new Date(until).toISOString() : null,
        message,
      };
      const res = await maintenanceService.set(payload);
      showToast("success", res?.data?.message || "Saved");
      setEnabled(nextEnabled);
      load();
    } catch (e) {
      showToast("error", e?.response?.data?.message || "Failed to update maintenance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-4 border-warning">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <strong>Maintenance Mode</strong>
        {active ? <Badge bg="danger">ACTIVE</Badge> : <Badge bg="secondary">Off</Badge>}
      </Card.Header>
      <Card.Body>
        <p className="text-muted small mb-3">
          When enabled, everyone except super admins sees a friendly maintenance page with a
          countdown. The login page stays reachable so you can turn it back off.
        </p>
        <Row className="g-3">
          <Col md={5}>
            <Form.Label className="small">Back online at (optional — drives the countdown)</Form.Label>
            <Form.Control
              type="datetime-local"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </Col>
          <Col md={7}>
            <Form.Label className="small">Message (optional)</Form.Label>
            <Form.Control
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="We'll be back soon…"
              maxLength={500}
            />
          </Col>
        </Row>
        <div className="d-flex gap-2 mt-3">
          {enabled ? (
            <>
              <Button variant="outline-primary" disabled={saving} onClick={() => save(true)}>
                Update
              </Button>
              <Button variant="success" disabled={saving} onClick={() => save(false)}>
                Turn Off
              </Button>
            </>
          ) : (
            <Button variant="warning" disabled={saving} onClick={() => save(true)}>
              Enable Maintenance
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default MaintenanceControl;
