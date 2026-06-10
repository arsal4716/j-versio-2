// frontend/src/pages/SuperAdmin/ApiBuilder/ApiBuilderPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, Select, Button, Space, Typography, message } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { getCenters } from "../../../store/slices/centerSlice";
import { getAllCampaigns } from "../../../store/slices/campaignSlice";
import {
  fetchApiConfigs,
  createApiConfig,
  updateApiConfig,
  deleteApiConfig,
  toggleApiConfig,
} from "../../../store/slices/apiConfigSlice";
import ApiConfigForm from "../../../components/ApiBuilder/ApiConfigForm";
import ApiConfigsTable from "../../../components/ApiBuilder/ApiConfigsTable";

const { Title } = Typography;

export default function ApiBuilderPage() {
  const dispatch = useDispatch();
  const { centers } = useSelector((s) => s.centers);
  const { campaigns } = useSelector((s) => s.campaigns);
  const apiState = useSelector((s) => s.apiConfigs);
  const user = useSelector((s) => s.auth.user);

  const isSuper = useMemo(() => (user?.roles || []).includes("super_admin"), [user]);
  const [centerId, setCenterId] = useState(null);
  const [campaignId, setCampaignId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (isSuper) dispatch(getCenters());
  }, [dispatch, isSuper]);

 useEffect(() => {
  if (!centerId) return;

  const center = (centers || []).find((c) => c._id === centerId);
  setCampaignId(null);

  if (center?.verificationCode) {
    dispatch(
      getAllCampaigns({
        centerId: center._id,
        verificationCode: center.verificationCode,
      })
    );
  }
}, [dispatch, centerId, centers]);

  useEffect(() => {
    if (centerId && campaignId) {
      dispatch(fetchApiConfigs({ centerId, campaignId }));
    }
  }, [dispatch, centerId, campaignId]);

  if (!isSuper) return <div style={{ padding: 16 }}>Access denied</div>;

  return (
    <div style={{ padding: 16 }}>
      <Title level={3}>Dynamic API Builder</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap style={{ width: "100%" }}>
          <Select
            style={{ width: 320 }}
            placeholder="Select Center"
            value={centerId}
            onChange={setCenterId}
            options={(centers || []).map((c) => ({ value: c._id, label: c.name }))}
          />
          <Select
            style={{ width: 320 }}
            placeholder="Select Campaign"
            value={campaignId}
            onChange={setCampaignId}
            disabled={!centerId}
            options={(campaigns || []).map((c) => ({ value: c._id, label: c.name }))}
          />

          <Button
            type="primary"
            disabled={!centerId || !campaignId}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Create API Config
          </Button>
        </Space>
      </Card>

      <ApiConfigsTable
        items={apiState.items}
        loading={apiState.loading}
        onEdit={(row) => {
          setEditing(row);
          setModalOpen(true);
        }}
        onDelete={async (row) => {
          await dispatch(deleteApiConfig(row._id)).unwrap().then(() => {
            message.success("Deleted");
          }).catch((e) => message.error(String(e)));
        }}
        onToggle={async (row, status) => {
          await dispatch(toggleApiConfig({ id: row._id, status })).unwrap().then(() => {
            message.success("Updated");
          }).catch((e) => message.error(String(e)));
        }}
      />

      <ApiConfigForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        loading={apiState.loading}
        centerId={centerId}
        campaignId={campaignId}
        initialValues={
          editing
            ? {
                ...editing,
                bodySchema: JSON.stringify(editing.bodySchema || {}, null, 2),
                authConfig: JSON.stringify(editing.authConfig || {}, null, 2),
              }
            : null
        }
        onSubmit={async (payload) => {
          try {
            if (editing?._id) {
              const patch = { ...payload };
              delete patch.centerId;
              delete patch.campaignId;
              await dispatch(updateApiConfig({ id: editing._id, patch })).unwrap();
              message.success("Updated");
            } else {
              await dispatch(createApiConfig(payload)).unwrap();
              message.success("Created");
            }
            setModalOpen(false);
          } catch (e) {
            message.error(String(e));
          }
        }}
      />
    </div>
  );
}