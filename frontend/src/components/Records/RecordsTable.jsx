// frontend/src/components/Records/RecordsTable.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Tag, Spin, Typography, Input, message, Descriptions, Popconfirm } from "antd";
import { SwapOutlined, DeleteOutlined } from "@ant-design/icons";
import { formatEST } from "../../utils/formatDate";
import { apiConfigService } from "../../services/apiConfigService";

const { Text } = Typography;

// Pulls a value out of the lead's form data by trying candidate key fragments.
function pickFormValue(formData = {}, candidates = []) {
  for (const key of Object.keys(formData)) {
    const lk = key.toLowerCase();
    if (candidates.some((c) => lk.includes(c))) return formData[key];
  }
  return "";
}

// Modal that pushes a single lead through one API config and shows the agent the
// exact request that was sent and the exact response received.
function ApiTransferModal({ open, onClose, apiConfig, record }) {
  const [customValues, setCustomValues] = useState({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const customFields = apiConfig?.customFields || [];

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await apiConfigService.executeForLead(apiConfig._id, {
        recordId: record._id,
        customValues,
      });
      setResult(res.data.data);
    } catch (e) {
      message.error(e.response?.data?.message || "Execution failed");
    } finally {
      setRunning(false);
    }
  };

  const close = () => {
    setResult(null);
    setCustomValues({});
    onClose();
  };

  return (
    <Modal
      title={`Data Transfer — ${apiConfig?.apiName || "API"}`}
      open={open}
      onCancel={close}
      width={760}
      footer={[
        <Button key="close" onClick={close}>Close</Button>,
        <Button key="run" type="primary" loading={running} onClick={run}>
          {result ? "Send Again" : "Send to API"}
        </Button>,
      ]}
    >
      {customFields.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>Extra fields required by this API</Text>
          {customFields.map((cf) => (
            <div key={cf.key} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                {cf.label || cf.key} {cf.required && <Text type="danger">*</Text>}
              </div>
              <Input
                value={customValues[cf.key] || ""}
                placeholder={`Enter ${cf.label || cf.key}`}
                onChange={(e) => setCustomValues((p) => ({ ...p, [cf.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      )}

      {running && <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>}

      {result && (
        <div>
          <Descriptions size="small" column={1} bordered style={{ marginBottom: 12 }}>
            <Descriptions.Item label="Method / URL">
              <Tag color="blue">{result.request.method}</Tag> {result.request.url}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={result.response.ok ? "green" : "red"}>{result.response.status}</Tag>
              <span style={{ marginLeft: 8, color: "#888" }}>{result.response.timeMs} ms</span>
            </Descriptions.Item>
          </Descriptions>

          <Text strong>Request sent</Text>
          <pre style={preStyle}>
            {JSON.stringify({ params: result.request.params, body: result.request.body }, null, 2)}
          </pre>

          <Text strong>Response</Text>
          <pre style={preStyle}>{JSON.stringify(result.response.data, null, 2)}</pre>
        </div>
      )}
    </Modal>
  );
}

const preStyle = {
  background: "#0f172a",
  color: "#e2e8f0",
  padding: 12,
  borderRadius: 8,
  fontSize: 12,
  maxHeight: 240,
  overflow: "auto",
  marginBottom: 12,
};

export default function RecordsTable({
  items = [],
  loading,
  apiConfigs = [],
  fieldLabels = {},
  expandAll = false,
  canDelete = false,
  onDelete,
}) {
  const [activeApi, setActiveApi] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState([]);

  // The "Form" toggle expands / collapses every row at once.
  useEffect(() => {
    setExpandedKeys(expandAll ? items.map((r) => r._id) : []);
  }, [expandAll, items]);

  const columns = useMemo(
    () => [
      { title: "TimeStamp(EST)", dataIndex: "createdAt", key: "createdAt", width: 190, render: (v) => formatEST(v, { suffix: false }) },
      { title: "Page", key: "page", width: 170, ellipsis: true, render: (_, r) => r?.metadata?.pageUrl || "—" },
      { title: "Phone Number", key: "phone", width: 140, render: (_, r) => pickFormValue(r.formData, ["phone"]) || "—" },
      { title: "IP Address", key: "ip", width: 150, ellipsis: true, render: (_, r) => r?.metadata?.ipAddress || "—" },
      { title: "Trustedform", key: "tf", width: 150, ellipsis: true, render: (_, r) => r?.metadata?.trustedForm || "—" },
      { title: "Jornaya", key: "jornaya", width: 150, ellipsis: true, render: (_, r) => r?.metadata?.leadId || "—" },
      {
        title: (
          <span className="portal-transfer-head">
            <SwapOutlined /> Data Transfer
          </span>
        ),
        key: "transfer",
        width: 220,
        render: (_, r) =>
          apiConfigs.length === 0 ? (
            <Text type="secondary">No APIs</Text>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {apiConfigs.map((api) => (
                <Button
                  key={api._id}
                  type="link"
                  className="portal-dlink"
                  disabled={api.status === "inactive"}
                  onClick={() => setActiveApi({ apiConfig: api, record: r })}
                  title={api.apiName}
                >
                  {api.apiName || "API"}
                </Button>
              ))}
            </div>
          ),
      },
      ...(canDelete
        ? [
            {
              title: "",
              key: "actions",
              width: 60,
              render: (_, r) => (
                <Popconfirm
                  title="Delete this record?"
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDelete?.(r)}
                >
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            },
          ]
        : []),
    ],
    [apiConfigs, canDelete, onDelete]
  );

  // Expanded row: every captured form field, shown by its human label.
  const expandedRowRender = (r) => {
    const fd = r.formData || {};
    return (
      <div style={{ padding: "4px 8px" }}>
        <Descriptions size="small" column={2} bordered>
          {Object.entries(fd).map(([k, v]) => (
            <Descriptions.Item key={k} label={fieldLabels[k] || k}>
              {String(v ?? "")}
            </Descriptions.Item>
          ))}
          {r?.metadata?.placeId && (
            <Descriptions.Item label="Place ID">{r.metadata.placeId}</Descriptions.Item>
          )}
          {r?.metadata?.deviceType && (
            <Descriptions.Item label="Device">{r.metadata.deviceType}</Descriptions.Item>
          )}
        </Descriptions>
      </div>
    );
  };

  return (
    <>
      <Table
        className="portal-table"
        rowKey="_id"
        loading={loading}
        dataSource={items}
        columns={columns}
        pagination={false}
        size="middle"
        scroll={{ x: 1200 }}
        expandable={{
          expandedRowRender,
          expandedRowKeys: expandedKeys,
          onExpandedRowsChange: (keys) => setExpandedKeys(keys),
        }}
      />

      {activeApi && (
        <ApiTransferModal
          open={!!activeApi}
          apiConfig={activeApi.apiConfig}
          record={activeApi.record}
          onClose={() => setActiveApi(null)}
        />
      )}
    </>
  );
}
