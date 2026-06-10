import { useState } from "react";
import { Navbar, Container, Nav, Button, Dropdown } from "react-bootstrap";
import { User, Settings, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import SettingsModal from "../Settings/SettingsModal";
import Logo from "../../assets/SelectCode.png";

const WhiteHeader = () => {
  const [showSettings, setShowSettings] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const centerId =
    user?.centerId?._id || user?.centerId || null; // handle populated or raw id

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
            <Nav.Link href="/portal/records" className="text-dark fw-medium mx-3">CRM</Nav.Link>
            <Nav.Link href="/privacy" className="text-dark fw-medium mx-3">Privacy Policy</Nav.Link>
            <Nav.Link href="/support" className="text-dark fw-medium mx-3">Support</Nav.Link>
          </Nav>

          <Nav className="d-flex align-items-center me-2">
            {/* Center default settings */}
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

      {centerId && (
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
