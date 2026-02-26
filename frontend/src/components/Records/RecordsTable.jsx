// frontend/src/components/Records/RecordsTable.jsx
import React from "react";
import { Table } from "antd";

export default function RecordsTable({ items = [], loading, apiConfigs = [] }) {
  const columns = [
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 200,
      render: (v) => new Date(v).toLocaleString(),
    },
    {
      title: "User",
      dataIndex: "userId",
      key: "userId",
      width: 220,
      render: (v) => (typeof v === "object" ? v?._id : v),
    },
    {
      title: "Form Data",
      key: "formData",
      render: (_, record) => (
        <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(record.formData || {}, null, 2)}
        </pre>
      ),
    },
    {
      title: "APIs (Campaign)",
      key: "apis",
      width: 260,
      render: () => (
        <div style={{ display: "grid", gap: 6 }}>
          {(apiConfigs || []).slice(0, 5).map((a) => (
            <div key={a._id} style={{ fontSize: 12 }}>
              • {a.apiName} ({a.status})
            </div>
          ))}
          {(apiConfigs || []).length > 5 ? (
            <div style={{ fontSize: 12 }}>+ more...</div>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <Table
      rowKey="_id"
      columns={columns}
      dataSource={items}
      loading={loading}
      pagination={false}
    />
  );
}