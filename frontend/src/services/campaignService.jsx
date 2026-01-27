import API from './api';
export const campaignService = {
  getAllCampaigns: async ({ centerId, verificationCode }) => {
    const response = await API.get("/form-setup/center/campaigns", {
      params: { centerId, verificationCode },
    });
    return response.data;
  },
};
