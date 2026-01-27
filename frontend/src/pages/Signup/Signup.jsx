import React, { useEffect, useState } from "react";
import AuthWrapper from "../../components/Auth/AuthWrapper";
import RegisterForm from "../../components/Auth/RegisterForm";
import Layout from "../../components/layout/Layout";
import VerificationModal from "../../Modal/VerificationModal";
import { useSelector } from "react-redux";

const Register = () => {
  const [showModal, setShowModal] = useState(false);
  const { verified, centerId, verificationCode, loading } = useSelector(
    (state) => state.verification
  );

  useEffect(() => {
    if (!verified) setShowModal(true);
  }, [verified]);

  const handleModalClose = () => {
    setShowModal(false);
  };

  return (
    <Layout>
      <AuthWrapper>
        {loading && <div className="text-center mt-4 text-muted">Verifying code...</div>}

        {!verified && (
          <VerificationModal show={showModal} onClose={handleModalClose} />
        )}

        {verified && centerId && verificationCode && (
          <RegisterForm />
        )}

        {verified && (!centerId || !verificationCode) && (
          <div className="text-center mt-4 text-muted">
            Loading campaigns...
          </div>
        )}
      </AuthWrapper>
    </Layout>
  );
};


export default Register;
