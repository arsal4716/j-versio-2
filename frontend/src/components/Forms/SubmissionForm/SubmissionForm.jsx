// components/SubmissionForm.jsx
import { Form, Col } from "react-bootstrap";
import { XCircle, CheckCircle } from "lucide-react";

const SubmissionForm = ({ field, value, onChange, validation = {} }) => {
  const { label, name, type, placeholder, required } = field;
  const { isInvalid = false, isValid = false, tagText, tagColor } = validation;

  const colWidth = name === "phone" ? 12 : 6;
  const inputId = `field-${name}`;

  return (
    <Col md={colWidth} className="mb-3">
      <Form.Group controlId={inputId}>
        <div className="form-floating">
          <Form.Control
            type={type || "text"}
            name={name}
            placeholder={placeholder || label}
            required={required}
            value={value}
            onChange={onChange}
            className={isInvalid ? "form-control-highlighted" : ""}
          />
          <label htmlFor={inputId}>{label}</label>
        </div>

        {(tagText || isValid || isInvalid) && (
          <div className="d-flex align-items-center mt-2">
            {tagText && (
              <div
                className="input-tag"
                style={{
                  backgroundColor: tagColor === "red" ? "#ffebeb" : "#f8f9fa",
                }}
              >
                {tagText}
                {tagColor === "red" && <XCircle size={14} className="ms-2 text-danger" />}
                {tagColor === "green" && (
                  <CheckCircle size={14} className="ms-2 text-success" />
                )}
              </div>
            )}

            {isValid && !tagText && <CheckCircle size={18} className="text-success" />}
            {isInvalid && !tagText && <XCircle size={18} className="text-danger" />}
          </div>
        )}
      </Form.Group>
    </Col>
  );
};

export default SubmissionForm;
