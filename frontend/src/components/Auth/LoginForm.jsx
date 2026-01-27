import React, { useState } from "react";
import { Form, Button, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../store/slices/authSlice";
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        showToast("error", errorMessage);
      }
    } catch (err) {
      showToast("error", "Something went wrong, try again.");
    }
  };

  return (
    <>
      <h3 className="fw-thin mb-4">Welcome Back</h3>
      <Form onSubmit={handleSubmit}>
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
      {error && <p className="text-danger text-center mt-2">{error}</p>}
    </>
  );
};

export default LoginForm;
