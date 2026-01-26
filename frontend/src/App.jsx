import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import { AnimatePresence, motion } from "framer-motion";
import store from "./store/store";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import CampaignPage from "./pages/Campaign/Campaign";
import CampaignFormPage from "./components/Forms/SubmissionForm/CampaignFormPage";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import AdminRoute from "./components/Auth/AdminRoute";
import AdminDashboard from "./pages/Admin/Dashboard/Dashboard";
import CentersPage from "./pages/Admin/CentersPage/Centers";
import FormSetupsPage from "./pages/Admin/FormSetupsPage/FormSetup";
import UsersPage from "./pages/Admin/UsersPage/Users";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";

const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const MotionContent = ({ children }) => (
  <motion.div 
    {...pageTransition} 
    transition={{ duration: 0.3 }}
    style={{ width: '100%' }}
  >
    {children}
  </motion.div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <MotionContent>
              <Home />
            </MotionContent>
          }
        />
        <Route
          path="/login"
          element={
            <MotionContent>
              <Login />
            </MotionContent>
          }
        />
        <Route
          path="/signup"
          element={
            <MotionContent>
              <Signup />
            </MotionContent>
          }
        />
        <Route
          path="/campaign-list"
          element={
            <MotionContent>
              <CampaignPage />
            </MotionContent>
          }
        />
        <Route
          path="/form/:centerId/:campaignName"
          element={
            <MotionContent>
              <CampaignFormPage />
            </MotionContent>
          }
        />

        {/* Protected User Routes */}
        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute>
              <MotionContent>
                <div>User Dashboard</div>
              </MotionContent>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/dashboard"
          element={
            <AdminRoute>
              <MotionContent>
                <AdminDashboard />
              </MotionContent>
            </AdminRoute>
          }
        />
        
        <Route
          path="/centers/*"
          element={
            <AdminRoute>
              <MotionContent>
                <CentersPage />
              </MotionContent>
            </AdminRoute>
          }
        />
        
        <Route
          path="/form-setup/*"
          element={
            <AdminRoute>
              <MotionContent>
                <FormSetupsPage />
              </MotionContent>
            </AdminRoute>
          }
        />
        
        <Route
          path="/users/*"
          element={
            <AdminRoute>
              <MotionContent>
                <UsersPage />
              </MotionContent>
            </AdminRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Layout>
          <AnimatedRoutes />
        </Layout>

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </Router>
    </Provider>
  );
}

export default App;