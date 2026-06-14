import React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { CheckCircle2, XCircle } from "lucide-react";

const PLANS = [
  {
    key: "plus",
    badge: "PLUS",
    accent: "#16a34a",
    headerBg: "#eafaf0",
    badgeBg: "#22c55e",
    priceLabel: "PKR 25,000",
    period: "/month",
    subtitle: "Built to keep you secure & compliant.",
    subtitleColor: "#16a34a",
    cta: "Choose Plan",
    features: [
      { label: "Same-City IP", on: true },
      { label: "Dedicated Residential IP", on: true },
      { label: "Dynamic Devices", on: true },
      { label: "Dynamic Browser Rotation", on: true },
      { label: "Random Cursor Activity", on: false },
      { label: "On-Page Movement", on: false },
      { label: "Bot Detection Evasion", on: false },
      { label: "Customized Visual Playbacks", on: false },
      { label: "Custom Cursor & Page Movement", on: false },
      { label: "LeadX CRM Integration", on: true },
      { label: "One-Time Database API Integration", on: false },
      { label: "Auto Data Scrubber", on: false },
      { label: "24/7 Support", on: true },
    ],
  },
  {
    key: "pro",
    badge: "PRO",
    accent: "#7c3aed",
    headerBg: "#f1edfe",
    badgeBg: "#7c3aed",
    priceLabel: "PKR 35,000",
    period: "/month",
    subtitle: "All features included. Maximum protection.",
    subtitleColor: "#7c3aed",
    cta: "Choose Plan",
    features: [
      { label: "300-Meter Geo-Targeted IP", hint: "Fetches IP within 300 meters", on: true },
      { label: "Dedicated Residential IP", on: true },
      { label: "Dynamic Devices", on: true },
      { label: "Dynamic Browser Rotation", on: true },
      { label: "Random Cursor Activity", on: true },
      { label: "On-Page Movement", on: true },
      { label: "Bot Detection Evasion", on: true },
      { label: "Customized Visual Playbacks", on: true },
      { label: "Custom Cursor & Page Movement", on: true },
      { label: "LeadX CRM Integration", on: true },
      { label: "One-Time Database API Integration", on: true },
      { label: "Auto Data Scrubber", on: true },
      { label: "24/7 Support", on: true },
    ],
  },
  {
    key: "custom",
    badge: "CUSTOM",
    accent: "#f59e0b",
    headerBg: "#fef3e2",
    badgeBg: "#f59e0b",
    priceLabel: "Custom",
    period: "",
    subtitle: "Fully customizable to match your needs.",
    subtitleColor: "#f59e0b",
    cta: "Contact Us",
    features: [
      { label: "All features included", on: true },
      { label: "Customize everything", on: true },
      { label: "Custom integrations", on: true },
      { label: "Tailored automation workflows", on: true },
      { label: "Scalable & flexible setup", on: true },
      { label: "Dedicated support", on: true },
      { label: "Built around your requirements", on: true },
    ],
  },
];

const PlanCard = ({ plan }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 20,
      boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
      overflow: "hidden",
      height: "100%",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <div style={{ background: plan.headerBg, padding: "28px 28px 24px" }}>
      <span
        style={{
          display: "inline-block",
          background: plan.badgeBg,
          color: "#fff",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: 0.5,
          padding: "4px 14px",
          borderRadius: 999,
          marginBottom: 18,
        }}
      >
        {plan.badge}
      </span>
      <div style={{ fontWeight: 800, fontSize: 34, lineHeight: 1.1, color: "#111" }}>
        {plan.priceLabel}
        {plan.period && (
          <span style={{ fontSize: 16, fontWeight: 600, color: "#6b7280" }}>{plan.period}</span>
        )}
      </div>
      <div style={{ marginTop: 10, fontWeight: 600, color: plan.subtitleColor }}>
        {plan.subtitle}
      </div>
    </div>

    <div style={{ padding: "24px 28px", flexGrow: 1 }}>
      {plan.features.map((f, i) => (
        <div key={i} className="d-flex align-items-start mb-3">
          {f.on ? (
            <CheckCircle2 size={20} style={{ color: plan.accent, flexShrink: 0, marginTop: 1 }} />
          ) : (
            <XCircle size={20} style={{ color: "#cbd5e1", flexShrink: 0, marginTop: 1 }} />
          )}
          <div className="ms-2">
            <div style={{ color: f.on ? "#1f2937" : "#9ca3af" }}>{f.label}</div>
            {f.hint && <div style={{ fontSize: 13, color: "#9ca3af" }}>{f.hint}</div>}
          </div>
        </div>
      ))}
    </div>

    <div style={{ padding: "0 28px 28px" }}>
      <Button
        href="mailto:hello@selectcode.ai"
        style={{
          width: "100%",
          background: "#0f172a",
          border: "none",
          borderRadius: 14,
          padding: "14px",
          fontWeight: 700,
        }}
      >
        {plan.cta}
      </Button>
    </div>
  </div>
);

const Pricing = () => {
  return (
    <section style={{ background: "#fafafa", minHeight: "80vh", padding: "60px 0" }}>
      <Container>
        <div className="text-center mb-5">
          <h1 style={{ fontWeight: 800, fontSize: 48, color: "#111" }}>Pricing Plans</h1>
          <p style={{ color: "#6b7280", fontSize: 18 }}>Choose the right plan for your needs.</p>
        </div>

        <Row className="g-4 justify-content-center">
          {PLANS.map((plan) => (
            <Col key={plan.key} xs={12} md={6} lg={4}>
              <PlanCard plan={plan} />
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
};

export default Pricing;
