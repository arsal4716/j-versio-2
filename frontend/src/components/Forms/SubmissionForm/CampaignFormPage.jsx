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
import { Row, Form, Button, Card, Spinner, Alert } from "react-bootstrap";
import SubmissionForm from "./SubmissionForm";
import { notifySuccess, notifyError } from "../../../utils/Notifications";
import { usStates } from "../../../utils/usStates";
import useDebouncedValue from "../../../hooks/useDebouncedValue";
import { dncService } from "../../../services/dncService";

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
      setFormData({});
      setTimeSpent(0);
    } else if (submissionState.error) {
      notifyError(submissionState.message);
    }

    dispatch(resetSubmissionState());
  }, [
    submissionState.message,
    submissionState.success,
    submissionState.error,
    dispatch,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      if (!/^\d*$/.test(value) || value.length > 10) return;
    }
    if (name === "zipCode") {
      if (!/^\d*$/.test(value) || value.length > 5) return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const dncBlocked = !!phoneCheck.result?.blocked;

  const handleSubmit = (e) => {
    e.preventDefault();

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

  // Per-field validation tags. The phone field reflects the live DNC result.
  const phoneValidation = () => {
    if (phoneCheck.loading) return { isChecking: true };
    const r = phoneCheck.result;
    if (!r || !r.valid) return {};
    if (r.blocked) {
      const failed = (r.checks || []).filter((c) => c.listed).map((c) => c.label).join(", ");
      return { isInvalid: true, tagText: `Blocked: ${failed}`, tagColor: "red" };
    }
    return { isValid: true, tagText: "Passed DNC", tagColor: "green" };
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
        className="d-flex justify-content-center"
        style={{ gap: 0, padding: "0 150px", alignItems: "stretch" }}
      >
        <div
          style={{
            width: "30%",
            backgroundColor: "#0033A0",
            borderRadius: "12px 0 0 12px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <LeftPanel />
        </div>

        <Card
          style={{
            width: "70%",
            borderRadius: "0 12px 12px 0",
            padding: "40px",
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

          <Form onSubmit={handleSubmit}>
            <Row>
              {allFields.map((field) => (
                <SubmissionForm
                  key={field._id || field.name}
                  field={field}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  options={field.name === "state" ? usStates : []}
                  validation={field.name === "phone" ? phoneValidation() : {}}
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
