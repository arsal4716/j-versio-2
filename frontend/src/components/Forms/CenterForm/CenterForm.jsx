import React, { useState, useEffect } from "react";
import { Form, Row, Col, Card, Button, Alert } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import {
  createCenter,
  updateCenter,
  clearError,
} from "../../../store/slices/centerSlice";

const CenterForm = ({ center = null, onSuccess }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.centers);

  const [formData, setFormData] = useState({
    name: "",
    verificationCode: "",
    centerAdminEmail: "",
    phone: "",
    proxy: {
      provider: "smartproxy",
      username: "",
      password: "",
      type: "zip"
    },
    googleSheets: {
      clientKeyFile: null,
      masterSheetId: "",
      adminSheetId: "",
    },
    settings: {
      typingSpeed: 800,
      stayOpenTime: 9,
      deviceDistribution: {
        desktop: 60,
        tablet: 20,
        mobile: 20,
      },
      referrers: ["https://google.com", "https://facebook.com"],
    },
    campaigns: [{ name: "", sheetTabId: "", isActive: true }],
  });

  const [referrerInput, setReferrerInput] = useState("");
  const [fileKey, setFileKey] = useState(Date.now()); // For resetting file input

  useEffect(() => {
    if (center) {
      // Convert center data to form structure
      setFormData({
        name: center.name || "",
        verificationCode: center.verificationCode || "",
        centerAdminEmail: center.centerAdminEmail || "",
        phone: center.phone || "",
        proxy: {
          provider: center.proxy?.provider || "decodo",
          username: center.proxy?.username || "",
          password: center.proxy?.password || "",
          type: center.proxy?.type || "zip"
        },
        googleSheets: {
          clientKeyFile: null,
          masterSheetId: center.googleSheets?.masterSheetId || "",
          adminSheetId: center.googleSheets?.adminSheetId || "",
        },
        settings: {
          typingSpeed: center.settings?.typingSpeed || 800,
          stayOpenTime: center.settings?.stayOpenTime || 9,
          deviceDistribution: {
            desktop: center.settings?.deviceDistribution?.desktop || 60,
            tablet: center.settings?.deviceDistribution?.tablet || 20,
            mobile: center.settings?.deviceDistribution?.mobile || 20,
          },
          referrers: center.settings?.referrers || ["https://google.com", "https://facebook.com"],
        },
        campaigns: center.campaigns?.length > 0 
          ? center.campaigns.map(c => ({
              name: c.name || "",
              sheetTabId: c.sheetTabId || "",
              isActive: c.isActive !== false
            }))
          : [{ name: "", sheetTabId: "", isActive: true }],
      });
    }
  }, [center]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleChange = (path, value) => {
    const paths = path.split(".");
    setFormData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      let current = newData;

      for (let i = 0; i < paths.length - 1; i++) {
        if (!current[paths[i]]) {
          current[paths[i]] = {};
        }
        current = current[paths[i]];
      }

      current[paths[paths.length - 1]] = value;
      return newData;
    });
  };

  const addReferrer = () => {
    if (referrerInput && !formData.settings.referrers.includes(referrerInput)) {
      handleChange("settings.referrers", [
        ...formData.settings.referrers,
        referrerInput,
      ]);
      setReferrerInput("");
    }
  };

  const removeReferrer = (index) => {
    const newReferrers = formData.settings.referrers.filter(
      (_, i) => i !== index
    );
    handleChange("settings.referrers", newReferrers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare form data for API
    const formDataToSend = new FormData();
    
    // Add text fields
    formDataToSend.append('name', formData.name);
    formDataToSend.append('verificationCode', formData.verificationCode);
    formDataToSend.append('centerAdminEmail', formData.centerAdminEmail);
    formDataToSend.append('phone', formData.phone || '');
    formDataToSend.append('proxy', JSON.stringify(formData.proxy));
    formDataToSend.append('googleSheets', JSON.stringify({
      masterSheetId: formData.googleSheets.masterSheetId,
      adminSheetId: formData.googleSheets.adminSheetId
    }));
    formDataToSend.append('settings', JSON.stringify(formData.settings));
    formDataToSend.append('campaigns', JSON.stringify(formData.campaigns));
    
    // Add file if present
    if (formData.googleSheets.clientKeyFile instanceof File) {
      formDataToSend.append('clientKeyFile', formData.googleSheets.clientKeyFile);
    }

    const result = await dispatch(
      center
        ? updateCenter({ 
            id: center._id, 
            centerData: formDataToSend,
            isFormData: true 
          })
        : createCenter(formDataToSend)
    );
    
    if (!result.error) {
      onSuccess?.();
    }
  };

  const updateCampaign = (index, key, value) => {
    setFormData((prev) => {
      const updated = [...(prev.campaigns || [])];
      updated[index] = { ...updated[index], [key]: value };
      return { ...prev, campaigns: updated };
    });
  };

  const addCampaign = () => {
    setFormData(prev => ({
      ...prev,
      campaigns: [...prev.campaigns, { name: "", sheetTabId: "", isActive: true }]
    }));
  };

  const removeCampaign = (index) => {
    if (formData.campaigns.length > 1) {
      setFormData(prev => ({
        ...prev,
        campaigns: prev.campaigns.filter((_, i) => i !== index)
      }));
    }
  };

  const validateDeviceDistribution = () => {
    const { desktop, tablet, mobile } = formData.settings.deviceDistribution;
    return desktop + tablet + mobile === 100;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleChange("googleSheets.clientKeyFile", file);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="danger" className="mb-4">
          <strong>Error:</strong> {error.message}
          {error.errors && (
            <ul className="mb-0 mt-2">
              {Object.values(error.errors).map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <Row className="mt-5">
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Basic Information</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Center Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                  placeholder="Enter center name"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Verification Code *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.verificationCode}
                  onChange={(e) =>
                    handleChange(
                      "verificationCode",
                      e.target.value.toUpperCase()
                    )
                  }
                  required
                  placeholder="Enter unique verification code"
                  disabled={!!center} // Can't change verification code after creation
                />
                {center && (
                  <Form.Text className="text-muted">
                    Verification code cannot be changed after creation
                  </Form.Text>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Email *</Form.Label>
                <Form.Control
                  type="email"
                  value={formData.centerAdminEmail}
                  onChange={(e) => handleChange("centerAdminEmail", e.target.value)}
                  required
                  placeholder="Enter Center Admin Email"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="Enter phone number"
                />
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Proxy Settings</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Provider</Form.Label>
                <Form.Select
                  value={formData.proxy.provider}
                  onChange={(e) =>
                    handleChange("proxy.provider", e.target.value)
                  }
                >
                  <option value="smartproxy">Smart Proxy</option>
                  <option value="decodo">Decodo</option>
                  <option value="other">Other</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Username</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.proxy.username}
                  onChange={(e) =>
                    handleChange("proxy.username", e.target.value)
                  }
                  placeholder="Proxy username"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={formData.proxy.password}
                  onChange={(e) =>
                    handleChange("proxy.password", e.target.value)
                  }
                  placeholder="Proxy password"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Type</Form.Label>
                <Form.Select
                  value={formData.proxy.type}
                  onChange={(e) =>
                    handleChange("proxy.type", e.target.value)
                  }
                >
                  <option value="zip">ZIP</option>
                  <option value="residential">Residential</option>
                  <option value="datacenter">Datacenter</option>
                </Form.Select>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Google Sheets Configuration</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Upload Google Client Key File</Form.Label>
                <Form.Control
                  key={fileKey}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                />
                {formData.googleSheets.clientKeyFile && (
                  <div className="mt-2">
                    <small className="text-success">
                      Selected: {formData.googleSheets.clientKeyFile.name}
                    </small>
                  </div>
                )}
                {center?.googleSheets?.clientKeyFile && !formData.googleSheets.clientKeyFile && (
                  <div className="mt-2">
                    <small className="text-muted">
                      Current file: {center.googleSheets.clientKeyFile}
                    </small>
                  </div>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Master Sheet ID</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.googleSheets.masterSheetId}
                  onChange={(e) =>
                    handleChange("googleSheets.masterSheetId", e.target.value)
                  }
                  placeholder="Google Sheets ID"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Admin Sheet ID</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.googleSheets.adminSheetId}
                  onChange={(e) =>
                    handleChange("googleSheets.adminSheetId", e.target.value)
                  }
                  placeholder="Google Sheets ID for admin data"
                />
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Behavior Settings</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Typing Speed (ms)</Form.Label>
                <Form.Control
                  type="number"
                  min="100"
                  max="5000"
                  value={formData.settings.typingSpeed}
                  onChange={(e) =>
                    handleChange(
                      "settings.typingSpeed",
                      parseInt(e.target.value) || 800
                    )
                  }
                />
                <Form.Text className="text-muted">
                  Time between keystrokes in milliseconds
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Stay Open Time (seconds)</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max="30"
                  value={formData.settings.stayOpenTime}
                  onChange={(e) =>
                    handleChange(
                      "settings.stayOpenTime",
                      parseInt(e.target.value) || 9
                    )
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Device Distribution</Form.Label>
                <Row>
                  <Col>
                    <Form.Label className="small">Desktop (%)</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      max="100"
                      value={formData.settings.deviceDistribution.desktop}
                      onChange={(e) =>
                        handleChange(
                          "settings.deviceDistribution.desktop",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </Col>
                  <Col>
                    <Form.Label className="small">Tablet (%)</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      max="100"
                      value={formData.settings.deviceDistribution.tablet}
                      onChange={(e) =>
                        handleChange(
                          "settings.deviceDistribution.tablet",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </Col>
                  <Col>
                    <Form.Label className="small">Mobile (%)</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      max="100"
                      value={formData.settings.deviceDistribution.mobile}
                      onChange={(e) =>
                        handleChange(
                          "settings.deviceDistribution.mobile",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </Col>
                </Row>
                {!validateDeviceDistribution() && (
                  <Form.Text className="text-danger">
                    Device distribution must total 100% (Current: {formData.settings.deviceDistribution.desktop + formData.settings.deviceDistribution.tablet + formData.settings.deviceDistribution.mobile}%)
                  </Form.Text>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Referrers</Form.Label>
                <div className="d-flex mb-2">
                  <Form.Control
                    type="text"
                    value={referrerInput}
                    onChange={(e) => setReferrerInput(e.target.value)}
                    placeholder="Add referrer URL"
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addReferrer())
                    }
                  />
                  <Button
                    variant="outline-primary"
                    onClick={addReferrer}
                    className="ms-2"
                  >
                    Add
                  </Button>
                </div>
                <div className="referrer-list">
                  {formData.settings.referrers.map((referrer, index) => (
                    <div
                      key={index}
                      className="d-flex justify-content-between align-items-center mb-1 p-2 border rounded"
                    >
                      <small>{referrer}</small>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeReferrer(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Campaigns</h5>
              <Button
                size="sm"
                variant="outline-primary"
                onClick={addCampaign}
              >
                + Add Campaign
              </Button>
            </Card.Header>

            <Card.Body>
              {(formData.campaigns || []).map((campaign, index) => (
                <Card key={index} className="mb-3 border">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Campaign #{index + 1}</h6>
                      {formData.campaigns.length > 1 && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeCampaign(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Campaign Name *</Form.Label>
                          <Form.Control
                            type="text"
                            value={campaign.name}
                            onChange={(e) =>
                              updateCampaign(index, "name", e.target.value)
                            }
                            placeholder="e.g. Medicare, ACA, Auto Insurance, etc."
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Sheet Tab ID / Name *</Form.Label>
                          <Form.Control
                            type="text"
                            value={campaign.sheetTabId}
                            onChange={(e) =>
                              updateCampaign(index, "sheetTabId", e.target.value)
                            }
                            placeholder="e.g. Sheet1 or gid:12345"
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        label="Active"
                        checked={campaign.isActive !== false}
                        onChange={(e) =>
                          updateCampaign(index, "isActive", e.target.checked)
                        }
                      />
                    </Form.Group>
                  </Card.Body>
                </Card>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="d-flex justify-content-end gap-2">
        <Button variant="outline-secondary" type="button" onClick={onSuccess}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={loading || !validateDeviceDistribution()}
        >
          {loading ? "Saving..." : center ? "Update Center" : "Create Center"}
        </Button>
      </div>
    </Form>
  );
};

export default CenterForm;