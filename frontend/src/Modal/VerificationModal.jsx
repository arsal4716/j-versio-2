import { Modal, Button, Spinner } from "react-bootstrap";
import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { verifyCode } from "../store/slices/verificationCodeSlice";
import { showToast } from "../utils/Notifications";

const LENGTH = 6;

const VerificationModal = ({ show, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.verification);
  const [digits, setDigits] = useState(Array(LENGTH).fill(""));
  const inputs = useRef([]);

  const code = digits.join("");

  const setDigit = (i, val) => {
    const v = val.replace(/\D/g, "");
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v.slice(-1);
      return next;
    });
    if (v && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, LENGTH);
    if (!text) return;
    e.preventDefault();
    const next = Array(LENGTH).fill("");
    text.split("").forEach((d, idx) => (next[idx] = d));
    setDigits(next);
    inputs.current[Math.min(text.length, LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    if (code.length !== LENGTH) {
      return showToast("error", "Please enter the full 6-digit code.");
    }
    try {
      const result = await dispatch(verifyCode(code)).unwrap();
      showToast("success", result.message || "Code verified!");
      onClose();
    } catch (err) {
      showToast("error", err?.message || "That code didn't match. Please check with your admin.");
      setDigits(Array(LENGTH).fill(""));
      inputs.current[0]?.focus();
    }
  };

  return (
    <Modal show={show} backdrop="static" keyboard={false} centered contentClassName="border-0">
      <div style={{ background: "#000a6b", color: "#fff", borderRadius: 8, padding: "36px 28px" }}>
        <div className="text-center mb-3">
          <BadgeCheck size={56} color="#fff" fill="#1d9bf0" />
        </div>
        <h4 className="text-center fw-light mb-1">Enter Verification Code</h4>
        <p className="text-center mb-4" style={{ opacity: 0.75, fontSize: 14 }}>
          Please get your code from the SelectCode team
        </p>

        <div className="d-flex justify-content-center gap-2 mb-3" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              inputMode="numeric"
              maxLength={1}
              style={{
                width: 46,
                height: 52,
                textAlign: "center",
                fontSize: 22,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.5)",
                background: "transparent",
                color: "#fff",
                outline: "none",
              }}
            />
          ))}
        </div>

        <p className="text-center mb-4" style={{ opacity: 0.75, fontSize: 13 }}>
          Didn't get a code? Contact SelectCode
        </p>

        <div className="d-flex justify-content-center gap-3">
          <Button variant="light" onClick={() => navigate("/login")} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleVerify}
            disabled={loading || code.length !== LENGTH}
          >
            {loading ? <Spinner size="sm" /> : "Verify"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default VerificationModal;
