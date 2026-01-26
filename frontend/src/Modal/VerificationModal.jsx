import { Modal, Form, Button, Spinner } from "react-bootstrap";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { verifyCode } from "../store/slices/verificationCodeSlice";
import { showToast } from "../utils/Notifications";

const VerificationModal = ({ show, onClose }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.verification);
  const [code, setCode] = useState("");

  const handleVerify = async () => {
    if (!code.trim()) return showToast("error", "Please enter a verification code");

    try {
      const result = await dispatch(verifyCode(code)).unwrap();
      showToast("success", result.message || "Verification successful!");
      onClose();
    } catch (err) {
      showToast("error", err.message || "Verification failed");
    }
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      backdrop="static"
      keyboard={false}
      centered
      dialogClassName="slide-down-modal"
      style={{ transition: "transform 0.5s ease, opacity 0.5s ease" }}
    >
      <Modal.Header closeButton>
        <Modal.Title className="text-danger fw-thin" style={{ fontSize: "0.9rem" }}>
          Reach out to Administrative Team to Get Code
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Control
              type="text"
              placeholder="Enter Verification Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Form.Group>
          <Button
            className="mt-3 w-100"
            variant="primary"
            onClick={handleVerify}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "Verify"}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default VerificationModal;
