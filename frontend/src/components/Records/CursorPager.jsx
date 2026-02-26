// frontend/src/components/Records/CursorPager.jsx
import React from "react";
import { Button, Space } from "antd";

export default function CursorPager({ hasMore, onNext, loading }) {
  return (
    <Space style={{ marginTop: 12 }}>
      <Button type="primary" onClick={onNext} disabled={!hasMore} loading={loading}>
        Load More
      </Button>
    </Space>
  );
}