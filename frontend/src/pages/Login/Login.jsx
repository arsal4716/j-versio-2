import React from "react";
import AuthWrapper from "../../components/Auth/AuthWrapper";
import LoginForm from "../../components/Auth/LoginForm";

// NOTE: App.jsx already wraps every route in <Layout>, so Login must NOT add a
// second Layout (that produced nested layouts / duplicate background video).
const Login = () => {
  return (
    <AuthWrapper>
      <LoginForm />
    </AuthWrapper>
  );
};

export default Login;
