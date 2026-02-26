// frontend/src/components/ApiBuilder/ApiConfigForm.jsx
import React, { useMemo } from "react";
import { Button, Form, Input, Modal, Select, InputNumber, Space } from "antd";
import KeyValueEditor from "./KeyValueEditor";

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const BODY_TYPES = ["json", "xml", "form-data", "raw", "encrypted"];
const AUTH_TYPES = ["none", "bearer", "basic", "apiKey"];

export default function ApiConfigForm({
  open,
  onClose,
  onSubmit,
  loading,
  initialValues,
  centerId,
  campaignId,
}) {
  const [form] = Form.useForm();

  const init = useMemo(
    () => ({
      apiName: "",
      method: "POST",
      endpointUrl: "",
      headers: [],
      queryParams: [],
      bodyType: "json",
      bodySchema: {},
      authType: "none",
      authConfig: {},
      timeout: 15000,
      retryCount: 0,
      status: "active",
      ...initialValues,
    }),
    [initialValues]
  );

  return (
    <Modal
      title={initialValues?._id ? "Update API Config" : "Create API Config"}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={900}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={init}
        onFinish={(values) => {
          const payload = {
            ...values,
            centerId,
            campaignId,
            bodySchema:
              typeof values.bodySchema === "string"
                ? safeParseJson(values.bodySchema)
                : values.bodySchema,
            authConfig:
              typeof values.authConfig === "string"
                ? safeParseJson(values.authConfig)
                : values.authConfig,
          };
          onSubmit?.(payload);
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Form.Item name="apiName" label="API Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Push Lead" />
          </Form.Item>

          <Form.Item name="method" label="Method" rules={[{ required: true }]}>
            <Select options={METHODS.map((m) => ({ value: m, label: m }))} />
          </Form.Item>
        </div>

        <Form.Item name="endpointUrl" label="Endpoint URL" rules={[{ required: true }]}>
          <Input placeholder="https://api.example.com/endpoint" />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Form.Item name="timeout" label="Timeout (ms)">
            <InputNumber min={1000} max={120000} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="retryCount" label="Retry Count">
            <InputNumber min={0} max={10} style={{ width: "100%" }} />
          </Form.Item>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Form.Item name="bodyType" label="Body Type">
            <Select options={BODY_TYPES.map((x) => ({ value: x, label: x }))} />
          </Form.Item>
          <Form.Item name="authType" label="Auth Type">
            <Select options={AUTH_TYPES.map((x) => ({ value: x, label: x }))} />
          </Form.Item>
        </div>

        <Form.Item name="headers" label="Headers">
          <KeyValueEditor />
        </Form.Item>

        <Form.Item name="queryParams" label="Query Params">
          <KeyValueEditor />
        </Form.Item>

        <Form.Item name="bodySchema" label="Body Schema (JSON)">
          <Input.TextArea rows={6} placeholder='{"key":"value"}' />
        </Form.Item>

        <Form.Item name="authConfig" label="Auth Config (JSON)">
          <Input.TextArea rows={4} placeholder='{"token":"..."} or {"username":"..","password":".."}' />
        </Form.Item>

        <Form.Item name="status" label="Status">
          <Select options={[{ value: "active" }, { value: "inactive" }].map((x) => ({ value: x.value, label: x.value }))} />
        </Form.Item>

        <Space style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {initialValues?._id ? "Update" : "Create"}
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}

function safeParseJson(v) {
  if (!v) return {};
  try {
    return JSON.parse(v);
  } catch {
    return {};
  }
}