// frontend/src/components/ApiBuilder/CustomFieldEditor.jsx
// Controlled editor for ApiConfig.customFields — API-only fields not collected on
// the lander (e.g. City). The agent fills these at send time on the portal.
import React from "react";
import { Button, Input, Select, Space, Switch } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";

const LOCATIONS = [
  { value: "body", label: "Body" },
  { value: "query", label: "Query" },
];

export default function CustomFieldEditor({ value = [], onChange }) {
  const rows = Array.isArray(value) ? value : [];
  const setRows = (next) => onChange?.(next);

  const addRow = () =>
    setRows([...rows, { key: "", label: "", location: "body", required: false }]);

  const update = (idx, patch) =>
    setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const remove = (idx) => setRows(rows.filter((_, i) => i !== idx));

  return (
    <div style={{ width: "100%" }}>
      <Space style={{ marginBottom: 8 }}>
        <Button icon={<PlusOutlined />} onClick={addRow}>Add Custom Field</Button>
      </Space>

      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((r, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 0.9fr auto auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <Input
              placeholder="API key (e.g. City)"
              value={r.key}
              onChange={(e) => update(idx, { key: e.target.value })}
            />
            <Input
              placeholder="Label shown to agent"
              value={r.label}
              onChange={(e) => update(idx, { label: e.target.value })}
            />
            <Select value={r.location} options={LOCATIONS} onChange={(v) => update(idx, { location: v })} />
            <Switch
              checkedChildren="Required"
              unCheckedChildren="Optional"
              checked={!!r.required}
              onChange={(v) => update(idx, { required: v })}
            />
            <Button danger icon={<DeleteOutlined />} onClick={() => remove(idx)} />
          </div>
        ))}
      </div>
    </div>
  );
}
