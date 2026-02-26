// frontend/src/components/Records/CenterPicker.jsx
import React from "react";
import { Select } from "antd";

export default function CenterPicker({ centers = [], value, onChange, disabled }) {
  return (
    <Select
      style={{ width: 320 }}
      placeholder="Select Center"
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={centers.map((c) => ({ value: c._id, label: c.name }))}
    />
  );
}