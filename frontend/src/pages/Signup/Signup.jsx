import React, { useEffect, useState } from "react";
import AuthWrapper from "../../components/Auth/AuthWrapper";
import RegisterForm from "../../components/Auth/RegisterForm";
import Layout from "../../components/layout/Layout";
import VerificationModal from "../../Modal/VerificationModal";
import { useSelector } from "react-redux";

const Register = () => {
  const [showModal, setShowModal] = useState(false);

  const { verified, centerId, verificationCode } = useSelector(
    (state) => state.verification
  );
  console.log('verficaiton', verified, centerId, verificationCode)

  useEffect(() => {
    if (!verified) {
      setShowModal(true);
    }
  }, [verified]);

  const canRenderForm = verified && centerId && verificationCode;

  return (
    <Layout>
      <AuthWrapper>
        {verified && !centerId ? (
          <div className="text-center mt-4 text-muted">
            Loading campaigns...
          </div>
        ) : canRenderForm ? (
          <RegisterForm />
        ) : (
          <p className="text-center mt-4 text-muted">
            Please verify your code to proceed with registration.
          </p>
        )}

        <VerificationModal
          show={!verified && showModal}
          onClose={() => setShowModal(false)}
        />
      </AuthWrapper>
    </Layout>
  );
};

export default Register;
