import API from './api';
export const campaignService = {
  getAllCampaigns: async ({ centerId, verificationCode }) => {
    console.log(
      "Fetching campaigns for centerId:",
      centerId,
      "verificationCode:",
      verificationCode
    );
    const response = await API.get("/form-setup/center/campaigns", {
      params: { centerId, verificationCode },
    });
    console.log('response',response)
    return response.data;
  },
};
