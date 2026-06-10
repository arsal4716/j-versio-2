export const DEFAULT_CENTER = {
  name: "",
  verificationCode: "",
  centerAdminEmail: "",
  phone: "",
  proxy: {
    provider: "smartproxy",
    username: "",
    password: "",
    type: "zip",
  },
  googleSheets: {
    clientKeyFile: null,
    masterSheetId: "",
    adminSheetId: "",
  },
  settings: {
    typingSpeed: 800,
    stayOpenTime: 9,
    deviceDistribution: {
      desktop: 60,
      tablet: 20,
      mobile: 20,
    },
    referrers: ["https://google.com", "https://facebook.com"],
  },
  campaigns: [{ name: "", sheetTabId: "", isActive: true }],
};

export const normalizeCenter = (center = {}) => ({
  ...DEFAULT_CENTER,
  ...center,
  proxy: { ...DEFAULT_CENTER.proxy, ...center.proxy },
  googleSheets: { ...DEFAULT_CENTER.googleSheets, ...center.googleSheets },
  settings: {
    ...DEFAULT_CENTER.settings,
    ...center.settings,
    deviceDistribution: {
      ...DEFAULT_CENTER.settings.deviceDistribution,
      ...center.settings?.deviceDistribution,
    },
  },
  campaigns:
    center.campaigns?.length > 0
      ? center.campaigns.map(c => ({
          name: c.name || "",
          sheetTabId: c.sheetTabId || "",
          isActive: c.isActive !== false,
        }))
      : DEFAULT_CENTER.campaigns,
});
