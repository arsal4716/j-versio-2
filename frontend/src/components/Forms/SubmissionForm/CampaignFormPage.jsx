import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchFormFields } from "../../../store/slices/FormFieldsByCampaign";
import { submitCampaignForm,resetSubmissionState  } from "../../../store/slices/submitFormSlice";
import WhiteHeader from "../../layout/WhiteHeader";
import LeftPanel from "../../Auth/LeftPanel";
import { Row, Form, Button, Card, Spinner } from "react-bootstrap";
import SubmissionForm from "./SubmissionForm";
import { notifySuccess, notifyError } from "../../../utils/Notifications";
const CampaignFormPage = () => {
  const { centerId, campaignName } = useParams();
  const dispatch = useDispatch();

  const { fields, loading, error } = useSelector(
    (state) => state.formFieldByCampaign
  );

  const submissionState = useSelector((state) => state.formSubmission);

  const [formData, setFormData] = useState({});

  useEffect(() => {
    dispatch(fetchFormFields({ centerId, campaignName }));
  }, [centerId, campaignName, dispatch]);
useEffect(() => {
  if (!submissionState.message) return;

  if (submissionState.success) {
    notifySuccess(submissionState.message);
    setFormData({}); // optional: clear inputs on success
  } else if (submissionState.error) {
    notifyError(submissionState.message);
  }

  // reset so toast doesn't repeat on refresh/re-render
  dispatch(resetSubmissionState());
}, [submissionState.message, submissionState.success, submissionState.error, dispatch]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(
      submitCampaignForm({
        centerId,
        campaignName,
        formData,
      })
    );
  };

  if (loading) return <div>Loading form…</div>;
  if (error) return <div>{error}</div>;

  return (
    <>
      <WhiteHeader />

      <div
        className="d-flex justify-content-center"
        style={{ gap: "0", padding: "100px", alignItems: "stretch" }}
      >
        {/* Left Panel */}
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

        {/* Form Card */}
        <Card
          style={{
            width: "70%",
            borderRadius: "0 12px 12px 0",
            padding: "40px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2 className="mb-4 text-center">Get Started Now</h2>

          <Form onSubmit={handleSubmit}>
            <Row>
              {fields.map((field) => (
                <SubmissionForm
                  key={field._id}
                  field={field}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
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
