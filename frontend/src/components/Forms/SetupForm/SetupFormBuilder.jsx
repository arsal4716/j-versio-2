import React, { useState, useEffect, useCallback } from "react";
import { Form, Button, Card, Row, Col, InputGroup, Alert } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import {
  createFormSetup,
  updateFormSetup,
  clearFormSetupError,
} from "../../../store/slices/formSetupSlice";
import { notifySuccess, notifyError } from "../../../utils/Notifications";

const FieldRow = ({ field, idx, onChange, onRemove }) => (
  <Card className="mb-2">
    <Card.Body>
      <Row className="g-2">
        <Col md={3}>
          <Form.Control
            value={field.label}
            placeholder="Label"
            onChange={(e) => onChange(idx, "label", e.target.value)}
          />
        </Col>
        <Col md={2}>
          <Form.Control
            value={field.name}
            placeholder="name"
            onChange={(e) => onChange(idx, "name", e.target.value)}
          />
        </Col>
        <Col md={2}>
          <Form.Select
            value={field.type}
            onChange={(e) => onChange(idx, "type", e.target.value)}
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="select">Select</option>
            <option value="radio">Radio</option>
            <option value="checkbox">Checkbox</option>
            <option value="date">Date</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Control
            value={field.selector}
            placeholder="CSS Selector (e.g. #fname)"
            onChange={(e) => onChange(idx, "selector", e.target.value)}
          />
        </Col>
        <Col md={1}>
          <Form.Check
            type="checkbox"
            label="Req"
            checked={field.required}
            onChange={(e) => onChange(idx, "required", e.target.checked)}
          />
        </Col>
        <Col md={1}>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => onRemove(idx)}
          >
            ×
          </Button>
        </Col>
      </Row>
      {["select", "radio", "checkbox"].includes(field.type) && (
        <Row className="mt-2">
          <Col>
            <InputGroup>
              <InputGroup.Text>Options (comma separated)</InputGroup.Text>
              <Form.Control
                placeholder="e.g. Yes, No, Maybe"
                value={(field.options || []).join(",")}
                onChange={(e) =>
                  onChange(
                    idx,
                    "options",
                    e.target.value.split(",").map((s) => s.trim())
                  )
                }
              />
            </InputGroup>
            <Form.Text className="text-muted">
              These choices appear in the {field.type} on the form.
            </Form.Text>
          </Col>
        </Row>
      )}
    </Card.Body>
  </Card>
);

const SetupFormBuilder = ({ 
  existing, 
  initialCenterId, 
  initialCampaignName, 
  onSuccess,
  mode = 'create'
}) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.formSetup || {});
  const EMPTY_CAPTURE = { leadId: "", tfCert: "", tfToken: "", tfPing: "", userIp: "" };
  const [form, setForm] = useState({
    centerId: initialCenterId || "",
    campaignName: initialCampaignName || "",
    landerUrl: "",
    submitButtonSelector: "",
    consentSelector: "",
    captureSelectors: { ...EMPTY_CAPTURE },
    notes: "",
    fields: [],
  });

  const updateCapture = (key, value) =>
    setForm((f) => ({
      ...f,
      captureSelectors: { ...EMPTY_CAPTURE, ...(f.captureSelectors || {}), [key]: value },
    }));

  // Initialize form with existing data or initial values
  useEffect(() => {
    if (existing) {
      setForm({ ...existing, captureSelectors: { ...EMPTY_CAPTURE, ...(existing.captureSelectors || {}) } });
    } else if (initialCenterId || initialCampaignName) {
      setForm(prev => ({
        ...prev,
        centerId: initialCenterId || prev.centerId,
        campaignName: initialCampaignName || prev.campaignName
      }));
    }
  }, [existing, initialCenterId, initialCampaignName]);

  useEffect(() => {
    if (error) {
      notifyError(error.message || "Error");
      dispatch(clearFormSetupError());
    }
  }, [error, dispatch]);

  const addField = () =>
    setForm((f) => ({
      ...f,
      fields: [
        ...f.fields,
        { label: "", name: "", type: "text", selector: "", required: false },
      ],
    }));

  const updateField = useCallback((idx, key, value) => {
    setForm((f) => {
      const fields = [...f.fields];
      fields[idx] = { ...fields[idx], [key]: value };
      return { ...f, fields };
    });
  }, []);

  const removeField = useCallback((idx) =>
    setForm((f) => ({ 
      ...f, 
      fields: f.fields.filter((_, i) => i !== idx) 
    })), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.centerId || !form.campaignName || !form.landerUrl) {
      notifyError("Center, Campaign, and Lander URL are required");
      return;
    }

    try {
      if (existing && existing._id) {
        await dispatch(
          updateFormSetup({ id: existing._id, payload: form })
        ).unwrap();
        notifySuccess("Form setup updated successfully!");
      } else {
        await dispatch(createFormSetup(form)).unwrap();
        notifySuccess("Form setup created successfully!");
        // Reset form for new entries
        if (mode === 'create') {
          setForm({
            centerId: initialCenterId || "",
            campaignName: initialCampaignName || "",
            landerUrl: "",
            submitButtonSelector: "",
            consentSelector: "",
            captureSelectors: { ...EMPTY_CAPTURE },
            notes: "",
            fields: [],
          });
        }
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      notifyError(err?.message || "Operation failed");
    }
  };

  const resetForm = () => {
    setForm({
      centerId: initialCenterId || "",
      campaignName: initialCampaignName || "",
      landerUrl: "",
      submitButtonSelector: "",
      consentSelector: "",
      captureSelectors: { ...EMPTY_CAPTURE },
      notes: "",
      fields: [],
    });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Card className="mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Center ID</Form.Label>
                <Form.Control
                  value={form.centerId}
                  onChange={(e) => setForm({ ...form, centerId: e.target.value })}
                  placeholder="centerId"
                  required
                  readOnly={!!initialCenterId}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Campaign Name</Form.Label>
                <Form.Control
                  value={form.campaignName}
                  onChange={(e) =>
                    setForm({ ...form, campaignName: e.target.value })
                  }
                  placeholder="e.g. ACA"
                  required
                  readOnly={!!initialCampaignName}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Lander URL *</Form.Label>
                <Form.Control
                  value={form.landerUrl}
                  onChange={(e) =>
                    setForm({ ...form, landerUrl: e.target.value })
                  }
                  placeholder="https://..."
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Submit Button Selector</Form.Label>
                <Form.Control
                  value={form.submitButtonSelector}
                  onChange={(e) =>
                    setForm({ ...form, submitButtonSelector: e.target.value })
                  }
                  placeholder="#submit"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Consent Selector</Form.Label>
                <Form.Control
                  value={form.consentSelector}
                  onChange={(e) =>
                    setForm({ ...form, consentSelector: e.target.value })
                  }
                  placeholder="#consent"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={1}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Header>
          <strong>Tracking Field Selectors</strong>{" "}
          <span className="text-muted small">(optional — leave blank to use the defaults)</span>
        </Card.Header>
        <Card.Body>
          <Alert variant="info" className="small mb-3">
            These read the hidden Jornaya / TrustedForm / IP fields off the lander.
            Most landers use the standard ids (shown as placeholders) — only set a
            value here if <em>this</em> campaign's lander uses a different id, e.g.
            a TrustedForm cert field named <code>#xxTrustedFormCertUrl_1</code>.
          </Alert>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label className="small">Jornaya LeadiD</Form.Label>
                <Form.Control
                  value={form.captureSelectors?.leadId || ""}
                  onChange={(e) => updateCapture("leadId", e.target.value)}
                  placeholder="#leadid_token"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="small">TrustedForm Cert URL</Form.Label>
                <Form.Control
                  value={form.captureSelectors?.tfCert || ""}
                  onChange={(e) => updateCapture("tfCert", e.target.value)}
                  placeholder="#xxTrustedFormCertUrl_0"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="small">TrustedForm Token</Form.Label>
                <Form.Control
                  value={form.captureSelectors?.tfToken || ""}
                  onChange={(e) => updateCapture("tfToken", e.target.value)}
                  placeholder="#xxTrustedFormToken_0"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="small">TrustedForm Ping URL</Form.Label>
                <Form.Control
                  value={form.captureSelectors?.tfPing || ""}
                  onChange={(e) => updateCapture("tfPing", e.target.value)}
                  placeholder="#xxTrustedFormPingUrl_0"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="small">IP Address Field</Form.Label>
                <Form.Control
                  value={form.captureSelectors?.userIp || ""}
                  onChange={(e) => updateCapture("userIp", e.target.value)}
                  placeholder="#user_ip"
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <strong>Fields</strong>
          <Button size="sm" onClick={addField}>
            Add New Field
          </Button>
        </Card.Header>
        <Card.Body>
          <Alert variant="warning" className="small mb-3">
            <strong>Naming matters — it drives validation.</strong> Use these
            field <em>names</em> so the form validates correctly:
            <ul className="mb-0 mt-1">
              <li>
                <code>phone</code> — runs the DNC check and enforces a 10-digit
                number (label it "Phone", "Phone Number", "Caller ID", etc.).
              </li>
              <li>
                <code>state</code> — shown as a US state dropdown automatically.
              </li>
              <li>
                <code>zip</code> or <code>zipcode</code> — enforces a 5-digit ZIP.
              </li>
              <li>
                <code>email</code> (or field type <code>email</code>) — validates
                the email format.
              </li>
            </ul>
            The <strong>Label</strong> is what the agent sees; the
            <strong> name</strong> is the internal key used for validation and
            API mapping.
          </Alert>
          {form.fields.length === 0 && (
            <Alert variant="info">No fields added yet. Click "Add New Field" to start.</Alert>
          )}
          {form.fields.map((fld, i) => (
            <FieldRow
              key={i}
              field={fld}
              idx={i}
              onChange={updateField}
              onRemove={removeField}
            />
          ))}
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-end gap-2">
        <Button
          variant="secondary"
          onClick={resetForm}
          disabled={loading}
        >
          Reset
        </Button>
        <Button 
          type="submit" 
          variant={existing ? "primary" : "success"}
          disabled={loading}
        >
          {loading ? "Saving..." : existing ? "Update Setup" : "Create Setup"}
        </Button>
      </div>
    </Form>
  );
};

export default SetupFormBuilder;