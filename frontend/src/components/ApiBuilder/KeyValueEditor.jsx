// frontend/src/components/ApiBuilder/KeyValueEditor.jsx
import React from "react";
import { Button, Input, Space, Switch } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";

export default function KeyValueEditor({ value = [], onChange, labelKey = "Key", labelValue = "Value" }) {
  const rows = Array.isArray(value) ? value : [];

  const setRows = (next) => onChange?.(next);

  const addRow = () => setRows([...rows, { key: "", value: "", enabled: true, secret: false }]);

  const update = (idx, patch) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setRows(next);
  };

  const remove = (idx) => {
    const next = rows.filter((_, i) => i !== idx);
    setRows(next);
  };

  return (
    <div style={{ width: "100%" }}>
      <Space style={{ marginBottom: 8 }}>
        <Button icon={<PlusOutlined />} onClick={addRow}>
          Add
        </Button>
      </Space>

      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((r, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto auto auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <Input
              placeholder={labelKey}
              value={r.key}
              onChange={(e) => update(idx, { key: e.target.value })}
            />
            <Input
              placeholder={labelValue}
              value={r.value}
              onChange={(e) => update(idx, { value: e.target.value })}
            />

            <Switch checked={!!r.enabled} onChange={(v) => update(idx, { enabled: v })} />
            <Switch checked={!!r.secret} onChange={(v) => update(idx, { secret: v })} />
            <Button danger icon={<DeleteOutlined />} onClick={() => remove(idx)} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
        Toggle 1: Enabled | Toggle 2: Secret (masked in UI)
      </div>
    </div>
  );
}