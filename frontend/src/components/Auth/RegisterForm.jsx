import React, { useState } from "react";
import { Form, Button, Spinner, Alert } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signupUser } from "../../store/slices/authSlice";
import { showToast } from "../../utils/Notifications";

const RegisterForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);

  // Campaigns come from the verified center (returned by the verify-code call),
  // so no authenticated request is needed during self-registration.
  const { centerId, verificationCode, campaigns } = useSelector(
    (state) => state.verification
  );

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
    agree: false,
    allowedCampaigns: [],
  });
  const [localError, setLocalError] = useState("");
  const [created, setCreated] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (localError) setLocalError("");
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" && name !== "agree" ? checked : value,
    }));
  };

  const handleCampaignChange = (campaignName) => {
    setFormData((prev) => {
      const updatedCampaigns = prev.allowedCampaigns.includes(campaignName)
        ? prev.allowedCampaigns.filter((name) => name !== campaignName)
        : [...prev.allowedCampaigns, campaignName];
      return { ...prev, allowedCampaigns: updatedCampaigns };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLocalError("");

    if (!formData.agree) {
      setLocalError("Please agree to the Terms & Policies to continue.");
      return;
    }
    if (formData.allowedCampaigns.length === 0) {
      setLocalError("Select at least one campaign you'll be working on.");
      return;
    }

    try {
      await dispatch(
        signupUser({ ...formData, centerId, verificationCode })
      ).unwrap();
      setCreated(true);
      showToast("success", "Account created successfully!");
      // Brief confirmation, then send them to the login page to sign in.
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const msg = err?.message || "Sign up failed. Please try again.";
      setLocalError(msg);
      showToast("error", msg);
    }
  };

  if (created) {
    return (
      <div className="text-center py-4">
        <Alert variant="success" className="mb-3">
          <div className="fw-bold mb-1">Account created successfully!</div>
          Redirecting you to the login page…
        </Alert>
        <Spinner animation="border" size="sm" />
      </div>
    );
  }

  return (
    <>
      <h3 className="fw-thin mb-1">Get Started Now</h3>
      <p className="text-muted small mb-4">Please register to continue</p>

      {localError && (
        <Alert variant="danger" className="py-2 text-center" role="alert">
          {localError}
        </Alert>
      )}

      <Form onSubmit={handleSubmit} noValidate>
        <Form.Group className="mb-3">
          <Form.Label className="small mb-1">Name</Form.Label>
          <Form.Control
            type="text"
            name="name"
            placeholder="Enter your Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="small mb-1">Company Name</Form.Label>
          <Form.Control
            type="text"
            name="company"
            placeholder="Enter your Company Name"
            value={formData.company}
            onChange={handleChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="small mb-1">Email Address</Form.Label>
          <Form.Control
            type="email"
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="small mb-1">Password</Form.Label>
          <Form.Control
            type="password"
            name="password"
            placeholder="Create a password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="small fw-semibold mb-1">
            Select your campaigns
          </Form.Label>
          {Array.isArray(campaigns) && campaigns.length > 0 ? (
            campaigns.map((campaign) => (
              <Form.Check
                key={campaign._id || campaign.name}
                type="checkbox"
                label={campaign.name}
                checked={formData.allowedCampaigns.includes(campaign.name)}
                onChange={() => handleCampaignChange(campaign.name)}
              />
            ))
          ) : (
            <p className="text-muted small mb-0">
              No active campaigns found for this center.
            </p>
          )}
        </Form.Group>

        <Form.Group className="mb-3 d-flex align-items-center">
          <Form.Check
            type="checkbox"
            name="agree"
            className="me-2"
            checked={formData.agree}
            onChange={handleChange}
          />
          <span className="small">I agree to the Terms &amp; Policies</span>
        </Form.Group>

        <Button type="submit" className="w-100 btn btn-primary" disabled={loading}>
          {loading ? <Spinner animation="border" size="sm" /> : "Sign up"}
        </Button>

        <div className="text-center mt-3">
          Have an account? <Link to="/login">Sign in</Link>
        </div>
      </Form>
    </>
  );
};

export default RegisterForm;
