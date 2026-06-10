import API from './api'; 
export const getFormFieldsByCampaign = async (centerId, campaignName) => {
  try {
    const res = await API.get(`/form-setup/fields/${centerId}/${campaignName}`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
