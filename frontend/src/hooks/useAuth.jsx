// frontend/src/hooks/useAuth.js
import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { signupUser, loginUser, logout, clearError } from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, loading, error } = useSelector((state) => state.auth);

  const signup = useCallback((userData) => {
    return dispatch(signupUser(userData));
  }, [dispatch]);

  const login = useCallback((credentials) => {
    return dispatch(loginUser(credentials));
  }, [dispatch]);

  const userLogout = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    user,
    token,
    loading,
    error,
    signup,
    login,
    logout: userLogout,
    clearError: clearAuthError,
    isAuthenticated: !!token,
  };
};