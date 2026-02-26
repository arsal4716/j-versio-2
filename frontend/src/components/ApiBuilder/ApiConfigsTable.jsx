// frontend/src/components/ApiBuilder/ApiConfigsTable.jsx
import React from "react";
import { Button, Space, Table, Tag } from "antd";

export default function ApiConfigsTable({ items = [], loading, onEdit, onDelete, onToggle }) {
  const columns = [
    { title: "Name", dataIndex: "apiName", key: "apiName" },
    { title: "Method", dataIndex: "method", key: "method", width: 100 },
    { title: "Endpoint", dataIndex: "endpointUrl", key: "endpointUrl", ellipsis: true },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v) => (v === "active" ? <Tag color="green">active</Tag> : <Tag color="default">inactive</Tag>),
    },
    {
      title: "Actions",
      key: "actions",
      width: 260,
      render: (_, row) => (
        <Space>
          <Button onClick={() => onEdit?.(row)}>Edit</Button>
          <Button onClick={() => onToggle?.(row, row.status === "active" ? "inactive" : "active")}>
            {row.status === "active" ? "Disable" : "Enable"}
          </Button>
          <Button danger onClick={() => onDelete?.(row)}>Delete</Button>
        </Space>
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