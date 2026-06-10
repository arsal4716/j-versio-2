import React, { useEffect, useState } from "react";
import { Form, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { getFormSetup } from "../../../store/slices/formSetupSlice";
import { notifySuccess, notifyError } from "../../../utils/Notifications";

const DynamicFormRenderer = ({ centerId, campaignName, onSubmitSuccess }) => {
  const dispatch = useDispatch();
  const { current, loading } = useSelector((s) => s.formSetup || {});
  const [localValues, setLocalValues] = useState({});

  useEffect(() => {
    if (centerId && campaignName)
      dispatch(getFormSetup({ centerId, campaignName }));
  }, [centerId, campaignName, dispatch]);

  useEffect(() => {
    if (current?.fields) {
      const init = {};
      current.fields.forEach((f) => (init[f.name] = ""));
      setLocalValues(init);
    }
  }, [current]);

  if (!current)
    return (
      <div className="text-muted">No form configured for this campaign.</div>
    );

  const handleChange = (name, value) =>
    setLocalValues((v) => ({ ...v, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        centerId,
        campaignName,
        formValues: localValues,
      };

      notifySuccess(
        "Form submitted (frontend) — now call backend to run puppeteer"
      );
      onSubmitSuccess && onSubmitSuccess(localValues);
    } catch (err) {
      notifyError(err.message || "Submit failed");
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {current.fields.map((f) => (
        <Form.Group className="mb-3" key={f._id || f.name}>
          <Form.Label>
            {f.label}
            {f.required ? " *" : ""}
          </Form.Label>
          {f.type === "select" ? (
            <Form.Select
              value={localValues[f.name] || ""}
              onChange={(e) => handleChange(f.name, e.target.value)}
              required={f.required}
            >
              <option value="">Select</option>
              {(f.options || []).map((o, i) => (
                <option key={i} value={o}>
                  {o}
                </option>
              ))}
            </Form.Select>
          ) : f.type === "checkbox" ? (
            <Form.Check
              type="checkbox"
              label={f.placeholder || f.label}
              checked={!!localValues[f.name]}
              onChange={(e) => handleChange(f.name, e.target.checked)}
            />
          ) : (
            <Form.Control
              type={
                f.type === "number"
                  ? "number"
                  : f.type === "date"
                  ? "date"
                  : "text"
              }
              placeholder={f.placeholder}
              value={localValues[f.name] || ""}
              onChange={(e) => handleChange(f.name, e.target.value)}
              required={f.required}
            />
          )}
        </Form.Group>
      ))}

      <div className="d-flex justify-content-end">
        <Button type="submit">Submit</Button>
      </div>
    </Form>
  );
};

export default DynamicFormRenderer;
