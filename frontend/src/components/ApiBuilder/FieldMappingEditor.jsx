// frontend/src/components/ApiBuilder/FieldMappingEditor.jsx
// Controlled editor for ApiConfig.fieldMappings. Each row maps a value source
// (a campaign form field, a captured system value, or a runtime custom field)
// to the key the buyer's API expects.
import React from "react";
import { Button, Input, Select, Space, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";

export const SYSTEM_FIELDS = [
  { value: "created_date", label: "Created Date" },
  { value: "original_lead_submit_date", label: "Original Lead Submit Date" },
  { value: "jornaya_lead_id", label: "Jornaya Lead ID" },
  { value: "trustedform", label: "TrustedForm" },
  { value: "ip_address", label: "Device IP Address" },
  { value: "place_id", label: "Place ID / CID" },
  { value: "page_url", label: "Page URL" },
  { value: "device_type", label: "Device Type" },
];

const SOURCES = [
  { value: "form", label: "Form Field" },
  { value: "system", label: "System Value" },
  { value: "custom", label: "Custom (agent enters)" },
];

const LOCATIONS = [
  { value: "body", label: "Body" },
  { value: "query", label: "Query" },
];

const STATE_FORMATS = [
  { value: "", label: "As-is" },
  { value: "full", label: "Full name (Texas)" },
  { value: "abbr", label: "Abbreviation (TX)" },
];

export default function FieldMappingEditor({ value = [], onChange, formFields = [] }) {
  const rows = Array.isArray(value) ? value : [];
  const setRows = (next) => onChange?.(next);

  const addRow = () =>
    setRows([
      ...rows,
      { apiKey: "", source: "form", sourceKey: "", location: "body", stateFormat: "", enabled: true },
    ]);

  const update = (idx, patch) =>
    setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const remove = (idx) => setRows(rows.filter((_, i) => i !== idx));

  const formOptions = formFields.map((f) => ({
    value: f.name,
    label: `${f.label || f.name} (${f.name})`,
  }));

  return (
    <div style={{ width: "100%" }}>
      <Space style={{ marginBottom: 8 }}>
        <Button icon={<PlusOutlined />} onClick={addRow}>Add Mapping</Button>
      </Space>

      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((r, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr 1.3fr 0.9fr 1fr auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <Input
              placeholder="API key (e.g. fname)"
              value={r.apiKey}
              onChange={(e) => update(idx, { apiKey: e.target.value })}
            />
            <Select
              value={r.source}
              options={SOURCES}
              onChange={(v) => update(idx, { source: v, sourceKey: "" })}
            />
            {r.source === "form" ? (
              <Select
                showSearch
                placeholder="Select form field"
                value={r.sourceKey || undefined}
                options={formOptions}
                optionFilterProp="label"
                onChange={(v) => update(idx, { sourceKey: v })}
              />
            ) : r.source === "system" ? (
              <Select
                placeholder="Select system value"
                value={r.sourceKey || undefined}
                options={SYSTEM_FIELDS}
                onChange={(v) => update(idx, { sourceKey: v })}
              />
            ) : (
              <Tooltip title="Value is entered by the agent at send time, keyed by the API key">
                <Input disabled value="Agent-entered at runtime" />
              </Tooltip>
            )}
            <Select value={r.location} options={LOCATIONS} onChange={(v) => update(idx, { location: v })} />
            <Select
              value={r.stateFormat || ""}
              options={STATE_FORMATS}
              onChange={(v) => update(idx, { stateFormat: v })}
            />
            <Button danger icon={<DeleteOutlined />} onClick={() => remove(idx)} />
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            No mappings yet — without mappings the lead's raw form data is sent as-is.
          </div>
        )}
      </div>
    </div>
  );
}
