import React from "react";
import AuthWrapper from "../../components/Auth/AuthWrapper";
import LoginForm from "../../components/Auth/LoginForm";
import Layout from "../../components/layout/Layout";

const Login = () => {
  return (
    <Layout>
      <AuthWrapper>
        <LoginForm />
      </AuthWrapper>
    </Layout>
  );
};

export default Login;
