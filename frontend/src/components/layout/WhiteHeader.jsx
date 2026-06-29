import { useState, useEffect } from "react";
import { Navbar, Container, Nav, Button, Dropdown } from "react-bootstrap";
import { User, Settings, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import { settingsService } from "../../services/settingsService";
import SettingsModal from "../Settings/SettingsModal";
import Logo from "../../assets/SelectCode.png";

const WhiteHeader = () => {
  const [showSettings, setShowSettings] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const centerId =
    user?.centerId?._id || user?.centerId || null; // handle populated or raw id

  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isPrivileged = roles.includes("admin") || roles.includes("super_admin");
  const isAgent = !!user && !isPrivileged;

  // Agents only see the CRM link when their admin has enabled CRM access for at
  // least one of their campaigns. Start HIDDEN for agents so the button never
  // flashes on then off; it appears only once access is confirmed. Privileged
  // users always see it.
  const [agentCrm, setAgentCrm] = useState(false);
  useEffect(() => {
    if (!isAgent) return;
    let cancelled = false;
    settingsService
      .getUiAccess()
      .then((res) => {
        if (!cancelled) setAgentCrm(res?.data?.data?.agentCrm !== false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAgent]);

  const showCrm = isPrivileged || agentCrm;

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <>
      <Navbar
        expand="lg"
        className="bg-white shadow-sm py-2 mb-5 mt-3 mx-auto rounded-pill"
        style={{ maxWidth: "1200px" }}
      >
        <Container
          fluid="lg"
          className="d-flex align-items-center justify-content-between"
        >
          <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
            <img src={Logo} alt="SelectCode Logo" height="40" className="ms-2" />
          </Navbar.Brand>

          <Nav className="mx-auto d-none d-lg-flex">
            <Nav.Link href="/truform" className="text-dark fw-medium mx-3">Truform</Nav.Link>
            {showCrm && (
              <Nav.Link href="/portal/records" className="text-dark fw-medium mx-3">CRM</Nav.Link>
            )}
            <Nav.Link href="/privacy" className="text-dark fw-medium mx-3">Privacy Policy</Nav.Link>
            <Nav.Link href="/support" className="text-dark fw-medium mx-3">Support</Nav.Link>
          </Nav>

          <Nav className="d-flex align-items-center me-2">
            {/* Center settings — admins/super-admins only (agents can't edit settings) */}
            {isPrivileged && (
              <Button
                variant="light"
                className="rounded-circle p-2 me-2 border-0 shadow-sm"
                style={{ width: "40px", height: "40px" }}
                title="Center Settings"
                disabled={!centerId}
                onClick={() => setShowSettings(true)}
              >
                <Settings size={20} className="text-secondary" />
              </Button>
            )}

            {/* User profile + logout */}
            <Dropdown align="end">
              <Dropdown.Toggle
                as="div"
                className="rounded-circle p-2 border-0 shadow-sm d-flex align-items-center justify-content-center"
                style={{ width: "40px", height: "40px", backgroundColor: "#f1f3f5", cursor: "pointer" }}
              >
                <User size={20} className="text-secondary" />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Header>
                  <div className="fw-bold">{user?.name || "User"}</div>
                  <div className="small text-muted">{user?.email}</div>
                </Dropdown.Header>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  <LogOut size={16} className="me-2" /> Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Container>
      </Navbar>

      {isPrivileged && centerId && (
        <SettingsModal
          show={showSettings}
          onHide={() => setShowSettings(false)}
          centerId={centerId}
          campaignName={null}
        />
      )}
    </>
  );
};

export default WhiteHeader;
