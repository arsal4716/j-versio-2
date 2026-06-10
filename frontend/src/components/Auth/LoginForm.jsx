import React, { useState, useEffect } from "react";
import { Form, Button, Spinner, Alert } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, clearError } from "../../store/slices/authSlice";
import { showToast } from "../../utils/Notifications";
import { useNavigate } from "react-router-dom";

const LoginForm = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });
  // Local copy so the message stays visible even if the store error is cleared
  // elsewhere; it is only reset when the user edits a field or retries.
  const [localError, setLocalError] = useState("");

  // Clear any stale auth error left over from a previous visit on mount.
  useEffect(() => {
    dispatch(clearError());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror store error into the durable local message.
  useEffect(() => {
    if (error) setLocalError(error);
  }, [error]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (localError) setLocalError("");
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    // Prevent the browser's native submit which would reload the page and wipe
    // the error message — the root cause of the message disappearing.
    e.preventDefault();
    e.stopPropagation();
    setLocalError("");
    try {
      const resultAction = await dispatch(loginUser(formData));
      if (loginUser.fulfilled.match(resultAction)) {
        const { data, message } = resultAction.payload;
        const user = data.user;
        showToast("success", message);
        if (user.roles.includes("super_admin")) navigate("/dashboard");
        else navigate("/campaign-list");
      } else {
        const errorMessage =
          resultAction.payload?.message || "Invalid credentials";
        setLocalError(errorMessage);
        showToast("error", errorMessage);
      }
    } catch (err) {
      const msg = "Something went wrong, try again.";
      setLocalError(msg);
      showToast("error", msg);
    }
  };

  return (
    <>
      <h3 className="fw-thin mb-4">Welcome Back</h3>
      {localError && (
        <Alert variant="danger" className="py-2 text-center" role="alert">
          {localError}
        </Alert>
      )}
      <Form onSubmit={handleSubmit} noValidate>
        <Form.Group className="mb-3">
          <Form.Control
            type="email"
            name="email"
            placeholder="User Name / Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </Form.Group>
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
        <Form.Group className="mb-3 d-flex justify-content-between">
          <Form.Check
            type="checkbox"
            name="remember"
            label="Remember me"
            checked={formData.remember}
            onChange={handleChange}
          />
          <Link to="/forgot-password">Forgot Password?</Link>
        </Form.Group>
        <Button
          type="submit"
          className="w-100 btn btn-primary"
          disabled={loading}
        >
          {loading ? <Spinner animation="border" size="sm" /> : "Sign in"}
        </Button>

        <div className="text-center mt-3">
          Don’t have an account? <Link to="/signup">Sign up</Link>
        </div>
      </Form>
    </>
  );
};

export default LoginForm;
