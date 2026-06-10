// frontend/src/components/Records/CampaignTabs.jsx
import React from "react";
import { Tabs } from "antd";

export default function CampaignTabs({ campaigns = [], activeKey, onChange }) {
  return (
    <Tabs
      activeKey={activeKey}
      onChange={onChange}
      items={campaigns.map((c) => ({
        key: c.name,     
        label: c.name,
      }))}
    />
  );
}