import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchFormFields } from "../../../store/slices/FormFieldsByCampaign";
import {
  submitCampaignForm,
  resetSubmissionState,
} from "../../../store/slices/submitFormSlice";
import WhiteHeader from "../../layout/WhiteHeader";
import LeftPanel from "../../Auth/LeftPanel";
import { Row, Form, Button, Card, Spinner, Alert, ProgressBar } from "react-bootstrap";
import SubmissionForm from "./SubmissionForm";
import { notifySuccess, notifyError } from "../../../utils/Notifications";
import { usStates } from "../../../utils/usStates";
import useDebouncedValue from "../../../hooks/useDebouncedValue";
import { dncService } from "../../../services/dncService";

const ResultRow = ({ label, value }) => (
  <div className="d-flex justify-content-between">
    <span className="fw-medium">{label}:</span>
    {value ? (
      <span className="text-break ms-2" style={{ maxWidth: "70%", textAlign: "right" }}>
        {value}
      </span>
    ) : (
      <span className="text-warning ms-2">Not captured</span>
    )}
  </div>
);

const CampaignFormPage = () => {
  const { centerId, campaignName } = useParams();
  const dispatch = useDispatch();

  const { fields, loading, error } = useSelector(
    (state) => state.formFieldByCampaign,
  );
  const submissionState = useSelector((state) => state.formSubmission);

  const [formData, setFormData] = useState({});

  // Real-time DNC / phone checker state.
  const [phoneCheck, setPhoneCheck] = useState({ loading: false, result: null });
  const [dncOverride, setDncOverride] = useState(false);
  const debouncedPhone = useDebouncedValue(formData.phone || "", 450);

  const [timeSpent, setTimeSpent] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  useEffect(() => {
    let timer;
    if (timerActive) {
      timer = setInterval(() => setTimeSpent((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [timerActive]);
  useEffect(() => {
    dispatch(fetchFormFields({ centerId, campaignName }));
  }, [centerId, campaignName, dispatch]);

  // Run enabled DNC checks as the agent types the phone number. A change to the
  // number clears any prior override the agent had granted.
  useEffect(() => {
    const digits = (debouncedPhone || "").replace(/\D+/g, "");
    setDncOverride(false);
    if (digits.length !== 10) {
      setPhoneCheck({ loading: false, result: null });
      return;
    }
    let cancelled = false;
    setPhoneCheck({ loading: true, result: null });
    dncService
      .check({ centerId, campaignName, phone: digits })
      .then((res) => {
        if (!cancelled) setPhoneCheck({ loading: false, result: res.data.data });
      })
      .catch(() => {
        if (!cancelled) setPhoneCheck({ loading: false, result: null });
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedPhone, centerId, campaignName]);

  useEffect(() => {
    if (!submissionState.message) return;

    if (submissionState.success) {
      notifySuccess(submissionState.message);
      // Clear the inputs for the next lead but keep the result panel
      // (submissionState.data) visible until the next submission starts.
      setFormData({});
      setTimeSpent(0);
    } else if (submissionState.error) {
      notifyError(submissionState.message);
    }
  }, [
    submissionState.message,
    submissionState.success,
    submissionState.error,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const lname = (name || "").toLowerCase();
    // Hard input limits keyed by field semantics (works regardless of the exact
    // field name the super admin chose): phone = 10 digits, ZIP = 5 digits.
    const isPhone = lname === "phone" || /phone/.test(lname) || /callerid/.test(lname);
    const isZip = /^zip/.test(lname) || /zip/.test(lname);
    if (isPhone) {
      if (!/^\d*$/.test(value) || value.length > 10) return;
    } else if (isZip) {
      if (!/^\d*$/.test(value) || value.length > 5) return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const dncBlocked = !!phoneCheck.result?.blocked;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailField = (f) =>
    f.type === "email" || /email/i.test(f.name) || /e-?mail/i.test(f.label || "");
  const isPhoneField = (f) => f.name === "phone" || /phone/i.test(f.name);
  const isZipField = (f) => /^zip/i.test(f.name) || /zip/i.test(f.label || "");

  // Returns a per-field format error string, or null if the field is valid.
  const fieldFormatError = (f, raw) => {
    const value = (raw ?? "").toString().trim();
    if (!value) return f.required ? `${f.label || f.name} is required` : null;
    if (isEmailField(f) && !EMAIL_RE.test(value)) return "Enter a valid email address";
    if (isPhoneField(f) && value.replace(/\D/g, "").length !== 10)
      return "Phone must be 10 digits";
    if (isZipField(f) && !/^\d{5}$/.test(value)) return "ZIP must be 5 digits";
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Format validation across all fields before anything else.
    for (const f of allFields) {
      const err = fieldFormatError(f, formData[f.name]);
      if (err) {
        notifyError(err);
        return;
      }
    }

    if (phoneCheck.loading) {
      notifyError("Please wait for the phone number check to finish.");
      return;
    }
    if (dncBlocked && !dncOverride) {
      notifyError("This number is blocked. Confirm the override to proceed.");
      return;
    }

    setTimeSpent(0);
    setTimerActive(true);
    const payload = dncBlocked && dncOverride ? { ...formData, dncOverride: true } : formData;
    dispatch(submitCampaignForm({ centerId, campaignName, formData: payload })).finally(
      () => setTimerActive(false),
    );
  };

  // Per-field validation tags. The phone field also reflects the live DNC result.
  const getFieldValidation = (f) => {
    if (isPhoneField(f)) {
      if (phoneCheck.loading) return { isChecking: true };
      const r = phoneCheck.result;
      if (r?.valid && r.blocked) {
        const failed = (r.checks || []).filter((c) => c.listed).map((c) => c.label).join(", ");
        return { isInvalid: true, tagText: `Blocked: ${failed}`, tagColor: "red" };
      }
      const value = (formData[f.name] || "").replace(/\D/g, "");
      if (value && value.length !== 10)
        return { isInvalid: true, tagText: "Phone must be 10 digits", tagColor: "red" };
      if (r?.valid && !r.blocked) return { isValid: true, tagText: "Passed DNC", tagColor: "green" };
      return {};
    }
    const value = formData[f.name];
    if (value) {
      const err = fieldFormatError(f, value);
      if (err) return { isInvalid: true, tagText: err, tagColor: "red" };
    }
    return {};
  };

  if (loading) return <div>Loading form…</div>;
  if (error) return <div>{error}</div>;
  const allFields = fields.some((f) => f.name === "state")
    ? fields
    : [
        ...fields,
        { name: "state", label: "State", type: "select", required: true },
      ];

  return (
    <>
      <WhiteHeader />

      <div
        className="d-flex flex-column flex-lg-row justify-content-center px-3 px-lg-5 py-3 py-lg-4"
        style={{ gap: 0, alignItems: "stretch", maxWidth: 1200, margin: "0 auto" }}
      >
        <div
          className="d-none d-lg-flex submission-left"
          style={{
            flex: "0 0 32%",
            backgroundColor: "#0033A0",
            borderRadius: "12px 0 0 12px",
            overflow: "hidden",
            flexDirection: "column",
          }}
        >
          <LeftPanel />
        </div>

        <Card
          className="submission-card flex-grow-1"
          style={{
            borderRadius: "12px",
            padding: "clamp(20px, 4vw, 40px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2 className="mb-2 text-center">Get Started Now</h2>
          <p className="text-center text-danger">
            Form Submission Time:{" "}
            {Math.floor(timeSpent / 60)
              .toString()
              .padStart(2, "0")}
            :{(timeSpent % 60).toString().padStart(2, "0")}
          </p>

          {submissionState.loading && (
            <Card className="mb-3 border-primary">
              <Card.Body className="text-center">
                <div className="d-flex align-items-center justify-content-center mb-2">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <span className="fw-bold">Form Queued</span>
                </div>
                <ProgressBar
                  now={submissionState.progress || 5}
                  animated
                  striped
                  className="mb-2"
                />
                <div className="text-muted">
                  {submissionState.phase || "Submitting…"}
                </div>
                <small className="text-muted">
                  Elapsed: {Math.floor(timeSpent / 60).toString().padStart(2, "0")}:
                  {(timeSpent % 60).toString().padStart(2, "0")} — you can keep this
                  tab open; the result will appear here automatically.
                </small>
              </Card.Body>
            </Card>
          )}

          {!submissionState.loading && submissionState.success && submissionState.data && (
            <Alert variant="success" className="mb-3" onClose={() => dispatch(resetSubmissionState())} dismissible>
              <div className="fw-bold mb-2">Submission Result</div>
              <div className="d-flex flex-column gap-1">
                <ResultRow label="IP Address" value={submissionState.data.ipAddress} />
                <ResultRow label="Jornaya Lead ID" value={submissionState.data.leadId} />
                {submissionState.data.placeId ? (
                  <ResultRow label="Place ID" value={submissionState.data.placeId} />
                ) : null}
                <ResultRow label="TrustedForm" value={submissionState.data.trustedForm} />
              </div>
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Row>
              {allFields.map((field) => (
                <SubmissionForm
                  key={field._id || field.name}
                  field={field}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  options={
                    field.name === "state"
                      ? usStates
                      : Array.isArray(field.options)
                      ? field.options
                      : []
                  }
                  validation={getFieldValidation(field)}
                />
              ))}
            </Row>

            {dncBlocked && (
              <Alert variant="danger" className="mt-2">
                <div className="fw-bold mb-2">
                  This phone number is on a Do-Not-Call / blacklist.
                </div>
                <Form.Check
                  type="checkbox"
                  id="dnc-override"
                  checked={dncOverride}
                  onChange={(e) => setDncOverride(e.target.checked)}
                  label="I have authorization to contact this number and accept responsibility for overriding the block."
                />
              </Alert>
            )}

            <div className="text-end mt-4">
              <Button
                type="submit"
                variant="primary"
                disabled={
                  submissionState.loading ||
                  phoneCheck.loading ||
                  (dncBlocked && !dncOverride)
                }
              >
                {submissionState.loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </>
  );
};

export default CampaignFormPage;
