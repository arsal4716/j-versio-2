import React from "react";
import "./Button.css";

const Button = ({
  children,
  variant = "primary",
  size = "medium",
  type = "button",
  disabled = false,
  loading = false,
  onClick,
  className = "",
  ...props
}) => {
  const buttonClass = `btn btn-${variant} btn-${size} ${className} ${
    disabled || loading ? "disabled" : ""
  }`.trim();

  return (
    <button
      type={type}
      className={buttonClass}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <>
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></span>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
