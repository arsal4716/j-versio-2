import React, { useEffect, useState } from "react";
import { Form, Button, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signupUser } from "../../store/slices/authSlice";
import { getAllCampaigns } from "../../store/slices/campaignSlice";
import { showToast } from "../../utils/Notifications";

const RegisterForm = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const { campaigns, loading: campaignLoading } = useSelector(
    (state) => state.campaigns
  );

const { centerId, verificationCode } = useSelector(
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

useEffect(() => {
  console.log("useEffect triggered:", { centerId, verificationCode });
  if (centerId && verificationCode) {
    console.log(" Dispatching getAllCampaigns:", centerId, verificationCode);
    dispatch(getAllCampaigns({ centerId, verificationCode }));
  }
}, [centerId, verificationCode, dispatch]);


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
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

    if (!formData.agree) {
      showToast("error", "You must agree to the Terms & Policies.");
      return;
    }

    try {
      const payload = {
        ...formData,
        centerId,
      };

      const result = await dispatch(signupUser(payload)).unwrap();
      showToast("success", result.message || "Signup successful!");
    } catch (err) {
      showToast("error", err.message || "Signup failed, try again.");
    }
  };

  return (
    <>
      <h3 className="fw-thin mb-4">Create User</h3>
      <Form onSubmit={handleSubmit}>
        {/* Name */}
        <Form.Group className="mb-3">
          <Form.Control
            type="text"
            name="name"
            placeholder="Enter Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </Form.Group>

        {/* Company */}
        <Form.Group className="mb-3">
          <Form.Control
            type="text"
            name="company"
            placeholder="Enter Company Name"
            value={formData.company}
            onChange={handleChange}
          />
        </Form.Group>

        {/* Email */}
        <Form.Group className="mb-3">
          <Form.Control
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </Form.Group>

        {/* Password */}
        <Form.Group className="mb-3">
          <Form.Control
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <label className="fw-semibold">Select Campaigns</label>
          {campaignLoading ? (
            <div className="text-muted">Loading campaigns...</div>
          ) : Array.isArray(campaigns) && campaigns.length > 0 ? (
            campaigns.map((campaign) => (
              <Form.Check
                key={campaign._id}
                type="checkbox"
                label={campaign.campaignName || campaign.name}
                checked={formData.allowedCampaigns.includes(campaign.name)}
                onChange={() => handleCampaignChange(campaign.name)}
              />
            ))
          ) : (
            <p className="text-muted">No campaigns found for this center.</p>
          )}
        </Form.Group>

        {/* Terms */}
        <Form.Group className="mb-3 d-flex align-items-center">
          <Form.Check
            type="checkbox"
            name="agree"
            className="me-2"
            checked={formData.agree}
            onChange={handleChange}
          />
          <span>I agree to the Terms & Policies</span>
        </Form.Group>

        {/* Submit */}
        <Button
          type="submit"
          className="w-100 btn btn-primary"
          disabled={loading}
        >
          {loading ? <Spinner animation="border" size="sm" /> : "Sign up"}
        </Button>

        <div className="text-center mt-3">
          Have an account? <Link to="/login">Sign in</Link>
        </div>
      </Form>

      {error && <p className="text-danger text-center mt-2">{error}</p>}
    </>
  );
};

export default RegisterForm;
