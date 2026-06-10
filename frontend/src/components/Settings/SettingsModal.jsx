import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Spinner, Row, Col } from "react-bootstrap";
import { settingsService } from "../../services/settingsService";
import { showToast } from "../../utils/Notifications";
import "./SettingsModal.css";

// Small reusable toggle row
const Toggle = ({ label, checked, onChange }) => (
  <div className="d-flex align-items-center gap-2">
    <Form.Check type="switch" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="setting-label">{label}</span>
  </div>
);

const ProviderRow = ({ label, value = {}, onChange, placeholder = "Enter API Key" }) => (
  <Row className="align-items-center mb-2">
    <Col xs={5} className="d-flex align-items-center gap-2">
      <Form.Check
        type="switch"
        checked={!!value.enabled}
        onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
      />
      <span className="setting-label">{label}</span>
    </Col>
    <Col xs={7}>
      <Form.Control
        size="sm"
        className="rounded-pill"
        placeholder={placeholder}
        value={value.apiKey || ""}
        disabled={!value.enabled}
        onChange={(e) => onChange({ ...value, apiKey: e.target.value })}
      />
    </Col>
  </Row>
);

const Section = ({ title, children }) => (
  <div className="settings-section">
    <div className="settings-section-header">{title}</div>
    <div className="settings-section-body">{children}</div>
  </div>
);

const SettingsModal = ({ show, onHide, centerId, campaignName = null }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState(null);

  useEffect(() => {
    if (!show || !centerId) return;
    setLoading(true);
    settingsService
      .get(centerId, campaignName)
      .then((res) => setS(res.data.data))
      .catch((e) => showToast("error", e.response?.data?.message || "Failed to load settings"))
      .finally(() => setLoading(false));
  }, [show, centerId, campaignName]);

  // helpers to set nested paths immutably
  const setPath = (path, val) => {
    setS((prev) => {
      const next = structuredClone(prev);
      let o = next;
      for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
      o[path[path.length - 1]] = val;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...s };
      if (campaignName) payload.campaignName = campaignName;
      delete payload._id;
      delete payload.centerId;
      const res = await settingsService.update(centerId, payload);
      setS(res.data.data);
      showToast("success", "Settings saved");
      onHide?.();
    } catch (e) {
      showToast("error", e.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">
          Settings {campaignName ? `— ${campaignName}` : "— Center Default"}
        </Modal.Title>
        <div className="ms-auto d-flex gap-2">
          <Button variant="light" onClick={onHide} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? <Spinner size="sm" /> : "Save"}
          </Button>
        </div>
      </Modal.Header>
      <Modal.Body>
        {loading || !s ? (
          <div className="text-center py-5"><Spinner /></div>
        ) : (
          <>
            <Section title="DNC Checkers">
              <Row>
                <Col md={6}>
                  <ProviderRow label="Black List Alliance" value={s.dnc.blacklistAlliance} onChange={(v) => setPath(["dnc", "blacklistAlliance"], v)} />
                  <ProviderRow label="TCPA Litigator List" value={s.dnc.tcpaLitigator} onChange={(v) => setPath(["dnc", "tcpaLitigator"], v)} />
                  <ProviderRow label="Internal DNC List" value={s.dnc.internalDncLeft} onChange={(v) => setPath(["dnc", "internalDncLeft"], v)} placeholder="Attach your Files" />
                </Col>
                <Col md={6}>
                  <ProviderRow label="Dnc.com" value={s.dnc.dncCom} onChange={(v) => setPath(["dnc", "dncCom"], v)} />
                  <ProviderRow label="LeadConduit" value={s.dnc.leadConduit} onChange={(v) => setPath(["dnc", "leadConduit"], v)} />
                  <ProviderRow label="Internal DNC List" value={s.dnc.internalDncRight} onChange={(v) => setPath(["dnc", "internalDncRight"], v)} placeholder="Attach your Files" />
                </Col>
              </Row>
            </Section>

            <Section title="Bot Detection">
              <Row>
                <Col md={6}><ProviderRow label="Anura.io" value={s.botDetection.anura} onChange={(v) => setPath(["botDetection", "anura"], v)} placeholder="Attach your Files" /></Col>
                <Col md={6}><ProviderRow label="Traffic Guard" value={s.botDetection.trafficGuard} onChange={(v) => setPath(["botDetection", "trafficGuard"], v)} placeholder="Attach your Files" /></Col>
              </Row>
            </Section>

            <Section title="Information Checkers">
              <Row className="align-items-center">
                <Col><Toggle label="truepeoplesearch" checked={s.infoCheckers.truePeopleSearch} onChange={(v) => setPath(["infoCheckers", "truePeopleSearch"], v)} /></Col>
                <Col><Toggle label="Thatsthem" checked={s.infoCheckers.thatsThem} onChange={(v) => setPath(["infoCheckers", "thatsThem"], v)} /></Col>
                <Col><Toggle label="fastpeoplesearch" checked={s.infoCheckers.fastPeopleSearch} onChange={(v) => setPath(["infoCheckers", "fastPeopleSearch"], v)} /></Col>
                <Col><ProviderRow label="Internal Database" value={s.infoCheckers.internalDatabase} onChange={(v) => setPath(["infoCheckers", "internalDatabase"], v)} placeholder="Attach your Files" /></Col>
              </Row>
            </Section>

            <Section title="Customization">
              <Row className="mb-3">
                <Col xs={2} className="fw-medium">Typing</Col>
                <Col><Toggle label="Random Typing Speed" checked={s.customization.typing.randomTypingSpeed} onChange={(v) => setPath(["customization", "typing", "randomTypingSpeed"], v)} /></Col>
                <Col><Toggle label="Random Typing Mistakes" checked={s.customization.typing.randomTypingMistakes} onChange={(v) => setPath(["customization", "typing", "randomTypingMistakes"], v)} /></Col>
                <Col><Toggle label="Dynamic Pointer Movement" checked={s.customization.typing.dynamicPointerMovement} onChange={(v) => setPath(["customization", "typing", "dynamicPointerMovement"], v)} /></Col>
              </Row>

              <Row className="mb-3">
                <Col xs={2} className="fw-medium">Browsers</Col>
                <Col>
                  <Row>
                    {Object.entries({ googleChrome: "Google Chrome", safari: "Safari Browser", firefox: "Mozilla Firefox", edge: "Microsoft Edge", samsungInternet: "Samsung Internet" }).map(([key, label]) => (
                      <Col md={4} key={key} className="mb-2">
                        <Toggle label={label} checked={s.customization.browsers[key].enabled} onChange={(v) => setPath(["customization", "browsers", key, "enabled"], v)} />
                        <Form.Control size="sm" className="rounded-pill mt-1" placeholder="Percentage" type="number" min={0} max={100}
                          value={s.customization.browsers[key].percentage}
                          disabled={!s.customization.browsers[key].enabled}
                          onChange={(e) => setPath(["customization", "browsers", key, "percentage"], Number(e.target.value))} />
                      </Col>
                    ))}
                  </Row>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={2} className="fw-medium">Devices</Col>
                <Col>
                  <Row>
                    {["mobile", "tablet", "desktop"].map((key) => (
                      <Col md={4} key={key} className="mb-2">
                        <Toggle label={key[0].toUpperCase() + key.slice(1)} checked={s.customization.devices[key].enabled} onChange={(v) => setPath(["customization", "devices", key, "enabled"], v)} />
                        <Form.Control size="sm" className="rounded-pill mt-1" placeholder="Percentage" type="number" min={0} max={100}
                          value={s.customization.devices[key].percentage}
                          disabled={!s.customization.devices[key].enabled}
                          onChange={(e) => setPath(["customization", "devices", key, "percentage"], Number(e.target.value))} />
                      </Col>
                    ))}
                  </Row>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={2} className="fw-medium">Referers</Col>
                <Col>
                  <Toggle label="Referer Links" checked={s.customization.referers.enabled} onChange={(v) => setPath(["customization", "referers", "enabled"], v)} />
                  <Form.Control as="textarea" rows={2} className="mt-1" placeholder="One URL per line"
                    value={(s.customization.referers.links || []).join("\n")}
                    disabled={!s.customization.referers.enabled}
                    onChange={(e) => setPath(["customization", "referers", "links"], e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))} />
                </Col>
              </Row>

              <Row>
                <Col xs={2} className="fw-medium">Onform Popup</Col>
                <Col><Toggle label="IP Address" checked={s.customization.onformPopup.ipAddress} onChange={(v) => setPath(["customization", "onformPopup", "ipAddress"], v)} /></Col>
                <Col><Toggle label="LeadID" checked={s.customization.onformPopup.leadId} onChange={(v) => setPath(["customization", "onformPopup", "leadId"], v)} /></Col>
                <Col><Toggle label="Trustedform" checked={s.customization.onformPopup.trustedform} onChange={(v) => setPath(["customization", "onformPopup", "trustedform"], v)} /></Col>
                <Col><Toggle label="API Response" checked={s.customization.onformPopup.apiResponse} onChange={(v) => setPath(["customization", "onformPopup", "apiResponse"], v)} /></Col>
                <Col><Toggle label="Random Message" checked={s.customization.onformPopup.randomMessage} onChange={(v) => setPath(["customization", "onformPopup", "randomMessage"], v)} /></Col>
              </Row>
            </Section>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default SettingsModal;
