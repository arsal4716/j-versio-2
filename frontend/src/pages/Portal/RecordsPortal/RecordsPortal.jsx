import React, { useEffect, useMemo, useState } from "react";
import { Input, DatePicker, Button, Dropdown, message } from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  SwapOutlined,
  FilterOutlined,
  ProfileOutlined,
} from "@ant-design/icons";
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
import "../../../components/Records/RecordsPortal.css";

export default function RecordsPortalPage() {
  const dispatch = useDispatch();

  const user = useSelector((s) => s.auth.user);
  const centersState = useSelector((s) => s.centers);
  const recordState = useSelector((s) => s.records);
  const tenant = useSelector((s) => s.tenant);

  const centers = centersState.centers || [];

  const roles = user?.roles || [];
  const isSuper = roles.includes("super_admin");
  const isUserOnly = roles.includes("user") && !roles.includes("admin") && !isSuper;

  const [activeCampaignName, setActiveCampaignName] = useState(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 450);
  const [range, setRange] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Client-side view controls (Sort / Filter / Form toggle).
  const [sortOrder, setSortOrder] = useState("desc");
  const [resultFilter, setResultFilter] = useState("all");
  const [expandAll, setExpandAll] = useState(false);

  const [apiConfigs, setApiConfigs] = useState([]);
  const [fieldLabels, setFieldLabels] = useState({});

  const effectiveCenterId = useMemo(() => {
    if (isSuper && tenant.overrideCenterId) return tenant.overrideCenterId;
    return user?.centerId || null;
  }, [isSuper, tenant.overrideCenterId, user?.centerId]);

  useEffect(() => {
    dispatch(getCenters());
  }, [dispatch]);

  const selectedCenter = useMemo(() => {
    if (!effectiveCenterId) return null;
    return centers.find((c) => c._id === effectiveCenterId) || null;
  }, [centers, effectiveCenterId]);

  const campaigns = useMemo(() => {
    const list = selectedCenter?.campaigns || [];
    return list.filter((c) => c?.isActive !== false);
  }, [selectedCenter]);

  useEffect(() => {
    const first = campaigns?.[0]?.name;
    if (first && !activeCampaignName) setActiveCampaignName(first);
    if (activeCampaignName && campaigns.length) {
      const stillExists = campaigns.some((c) => c.name === activeCampaignName);
      if (!stillExists) setActiveCampaignName(campaigns[0].name);
    }
  }, [campaigns, activeCampaignName]);

  // Fetch records whenever campaign / filters / refresh change.
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
    if (isSuper && effectiveCenterId) params.centerId = effectiveCenterId;

    dispatch(fetchRecords(params))
      .unwrap()
      .catch((e) => message.error(String(e)));
  }, [dispatch, activeCampaignName, debouncedSearch, range, isSuper, effectiveCenterId, refreshTick]);

  // API buttons + form-field labels for the active campaign.
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
  }, [activeCampaignName, effectiveCenterId, refreshTick]);

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

  // Apply Sort + Filter to the loaded rows.
  const displayItems = useMemo(() => {
    let arr = [...(recordState.items || [])];
    if (resultFilter !== "all") {
      arr = arr.filter((r) => (r.result || "success") === resultFilter);
    }
    arr.sort((a, b) =>
      sortOrder === "asc"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt)
    );
    return arr;
  }, [recordState.items, resultFilter, sortOrder]);

  const sortMenu = {
    items: [
      { key: "desc", label: "Newest first" },
      { key: "asc", label: "Oldest first" },
    ],
    onClick: ({ key }) => setSortOrder(key),
  };

  const filterMenu = {
    items: [
      { key: "all", label: "All results" },
      { key: "success", label: "Success only" },
      { key: "failed", label: "Failed only" },
    ],
    onClick: ({ key }) => setResultFilter(key),
  };

  return (
    <div className="portal-wrap">
      <div className="portal-header">
        <div className="portal-tabs" style={{ flex: 1, minWidth: 280 }}>
          <CampaignTabs
            campaigns={campaigns}
            activeKey={activeCampaignName}
            onChange={(name) => setActiveCampaignName(name)}
          />
        </div>

        <div className="portal-header-actions">
          {isSuper && (
            <CenterPicker
              centers={centers}
              value={tenant.overrideCenterId}
              onChange={(v) => dispatch(setOverrideCenterId(v))}
            />
          )}
          <div className="portal-daterange">
            <DatePicker.RangePicker
              value={range}
              onChange={setRange}
              format="MMM DD, YYYY"
              disabled={isUserOnly /* user role is locked to today */}
            />
          </div>
          <Button
            className="portal-refresh"
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => setRefreshTick((t) => t + 1)}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-toolbar">
          <Input
            className="portal-search"
            placeholder="Search"
            prefix={<SearchOutlined style={{ color: "#9b8fd6" }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
          <Dropdown menu={sortMenu} trigger={["click"]}>
            <Button className="portal-pill" icon={<SwapOutlined rotate={90} />}>
              Sort
            </Button>
          </Dropdown>
          <Dropdown menu={filterMenu} trigger={["click"]}>
            <Button className="portal-pill" icon={<FilterOutlined />}>
              Filter
            </Button>
          </Dropdown>
          <Button
            className="portal-pill"
            icon={<ProfileOutlined />}
            type={expandAll ? "primary" : "default"}
            onClick={() => setExpandAll((v) => !v)}
          >
            Form
          </Button>
        </div>

        <RecordsTable
          items={displayItems}
          loading={recordState.loading}
          apiConfigs={apiConfigs}
          fieldLabels={fieldLabels}
          expandAll={expandAll}
        />

        <CursorPager
          hasMore={recordState.hasMore}
          onNext={loadMore}
          loading={recordState.loading}
        />
      </div>
    </div>
  );
}
