import api from "./api";

const verifyCode = async (code) => {
  const response = await api.post("/verification/verify-code", { code });
  return response.data;
};

export default { verifyCode };
