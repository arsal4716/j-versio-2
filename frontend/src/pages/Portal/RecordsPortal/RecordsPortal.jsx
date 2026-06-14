import React, { useEffect, useMemo, useState } from "react";
import { Card, Space, Input, DatePicker, Typography, message } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { getCenters } from "../../../store/slices/centerSlice";
import { fetchRecords, resetRecords } from "../../../store/slices/recordSlice";
import { setOverrideCenterId } from "../../../store/slices/tenantSlice";
import useDebouncedValue from "../../../hooks/useDebouncedValue";
import { apiConfigService } from "../../../services/apiConfigService";
import { getFormFieldsByCampaign } from "../../../services/formFieldsforCampaign";

import CenterPicker from "../../../components/Records/CenterPicker";
import CampaignTabs from "../../../components/Records/CampaignTabs";
import RecordsTable from "../../../components/Records/RecordsTable";
import CursorPager from "../../../components/Records/CursorPager";

const { Title } = Typography;

export default function RecordsPortalPage() {
  const dispatch = useDispatch();

  const user = useSelector((s) => s.auth.user);
  const centersState = useSelector((s) => s.centers);
  const recordState = useSelector((s) => s.records);
  const tenant = useSelector((s) => s.tenant);

  const centers = centersState.centers || [];

  const roles = user?.roles || [];
  const isSuper = roles.includes("super_admin");

  const [activeCampaignName, setActiveCampaignName] = useState(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 450);
  const [range, setRange] = useState(null);

  // API configs + form-field labels for the active campaign (drives the
  // "Data Transfer" buttons and the label-mapped expanded rows).
  const [apiConfigs, setApiConfigs] = useState([]);
  const [fieldLabels, setFieldLabels] = useState({});

  const effectiveCenterId = useMemo(() => {
    if (isSuper && tenant.overrideCenterId) return tenant.overrideCenterId;
    return user?.centerId || null;
  }, [isSuper, tenant.overrideCenterId, user?.centerId]);

  // Always load centers so we can use center.campaigns for tabs
  useEffect(() => {
    dispatch(getCenters());
  }, [dispatch]);

  // Find selected center object
  const selectedCenter = useMemo(() => {
    if (!effectiveCenterId) return null;
    return centers.find((c) => c._id === effectiveCenterId) || null;
  }, [centers, effectiveCenterId]);

  // Build campaigns from selectedCenter.campaigns
  const campaigns = useMemo(() => {
    const list = selectedCenter?.campaigns || [];
    // show only active campaigns
    return list.filter((c) => c?.isActive !== false);
  }, [selectedCenter]);

  // Default active campaign
  useEffect(() => {
    const first = campaigns?.[0]?.name;
    if (first && !activeCampaignName) setActiveCampaignName(first);

    // if center changed and old campaign no longer exists, reset
    if (activeCampaignName && campaigns.length) {
      const stillExists = campaigns.some((c) => c.name === activeCampaignName);
      if (!stillExists) setActiveCampaignName(campaigns[0].name);
    }
  }, [campaigns, activeCampaignName]);

  // Fetch records whenever campaign/filters change
  useEffect(() => {
    if (!activeCampaignName) return;

    dispatch(resetRecords());

    const params = {
      campaignName: activeCampaignName,
      limit: 15,
      q: debouncedSearch || undefined,
      startDate: range?.[0]?.toISOString(),
      endDate: range?.[1]?.toISOString(),
    };

    // super admin can override centerId (backend should support this)
    if (isSuper && effectiveCenterId) params.centerId = effectiveCenterId;

    dispatch(fetchRecords(params))
      .unwrap()
      .catch((e) => message.error(String(e)));
  }, [dispatch, activeCampaignName, debouncedSearch, range, isSuper, effectiveCenterId]);

  // Load this campaign's API buttons + form-field labels (name -> label) so the
  // portal can show real "Data Transfer" buttons and human-readable field names.
  useEffect(() => {
    if (!activeCampaignName || !effectiveCenterId) {
      setApiConfigs([]);
      setFieldLabels({});
      return;
    }

    apiConfigService
      .listByCampaign({ centerId: effectiveCenterId, campaignName: activeCampaignName })
      .then((res) => setApiConfigs(res.data.data || []))
      .catch(() => setApiConfigs([]));

    getFormFieldsByCampaign(effectiveCenterId, activeCampaignName)
      .then((res) => {
        const map = {};
        (res?.data?.fields || []).forEach((f) => {
          if (f?.name) map[f.name] = f.label || f.name;
        });
        setFieldLabels(map);
      })
      .catch(() => setFieldLabels({}));
  }, [activeCampaignName, effectiveCenterId]);

  const loadMore = async () => {
    if (!recordState.cursor || !activeCampaignName) return;

    const params = {
      campaignName: activeCampaignName,
      limit: 15,
      cursor: recordState.cursor,
      q: debouncedSearch || undefined,
      startDate: range?.[0]?.toISOString(),
      endDate: range?.[1]?.toISOString(),
    };

    if (isSuper && effectiveCenterId) params.centerId = effectiveCenterId;

    await dispatch(fetchRecords(params))
      .unwrap()
      .catch((e) => message.error(String(e)));
  };

  return (
    <div style={{ padding: 16 }}>
      <Title level={3}>Record Portal</Title>

      <Card style={{ marginBottom: 12 }}>
        <Space wrap style={{ width: "100%" }}>
          {isSuper ? (
            <CenterPicker
              centers={centers}
              value={tenant.overrideCenterId}
              onChange={(v) => dispatch(setOverrideCenterId(v))}
            />
          ) : (
            <div style={{ fontSize: 14, opacity: 0.75 }}>
              Center locked: {user?.centerId}
            </div>
          )}

          <Input
            style={{ width: 320 }}
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <DatePicker.RangePicker value={range} onChange={setRange} />
        </Space>
      </Card>

      <Card>
        <CampaignTabs
          campaigns={campaigns}
          activeKey={activeCampaignName}
          onChange={(name) => setActiveCampaignName(name)}
        />

        <RecordsTable
          items={recordState.items}
          loading={recordState.loading}
          apiConfigs={apiConfigs}
          fieldLabels={fieldLabels}
        />

        <CursorPager
          hasMore={recordState.hasMore}
          onNext={loadMore}
          loading={recordState.loading}
        />
      </Card>
    </div>
  );
}