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
import { Row, Form, Button, Card, Spinner } from "react-bootstrap";
import SubmissionForm from "./SubmissionForm";
import { notifySuccess, notifyError } from "../../../utils/Notifications";
import { usStates } from "../../../utils/usStates";

const CampaignFormPage = () => {
  const { centerId, campaignName } = useParams();
  const dispatch = useDispatch();

  const { fields, loading, error } = useSelector(
    (state) => state.formFieldByCampaign,
  );
  const submissionState = useSelector((state) => state.formSubmission);

  const [formData, setFormData] = useState({});
  const [timeSpent, setTimeSpent] = useState(0);

  // Start timer
  useEffect(() => {
    const timer = setInterval(() => setTimeSpent((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch form fields
  useEffect(() => {
    dispatch(fetchFormFields({ centerId, campaignName }));
  }, [centerId, campaignName, dispatch]);

  // Handle submission state
  useEffect(() => {
    if (!submissionState.message) return;

    if (submissionState.success) {
      notifySuccess(submissionState.message);
      setFormData({});
      setTimeSpent(0); // reset timer on success
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

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Phone only digits, max 10
    if (name === "phone") {
      if (!/^\d*$/.test(value) || value.length > 10) return;
    }
    // Zip code only digits, max 5
    if (name === "zipCode") {
      if (!/^\d*$/.test(value) || value.length > 5) return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(submitCampaignForm({ centerId, campaignName, formData }));
  };

  if (loading) return <div>Loading form…</div>;
  if (error) return <div>{error}</div>;

  // Ensure "state" field exists even if backend didn't provide it
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
        style={{ gap: 0, padding: "100px", alignItems: "stretch" }}
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
          <p className="text-center text-muted">Time on page: {timeSpent}s</p>

          <Form onSubmit={handleSubmit}>
            <Row>
              {allFields.map((field) => (
                <SubmissionForm
                  key={field._id || field.name}
                  field={field}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  options={field.name === "state" ? usStates : []}
                />
              ))}
            </Row>

            <div className="text-end mt-4">
              <Button
                type="submit"
                variant="primary"
                disabled={submissionState.loading}
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
