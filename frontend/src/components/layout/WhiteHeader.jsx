import { Navbar, Container, Nav, Button } from "react-bootstrap";
import { User, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "../../assets/SelectCode.png";

const WhiteHeader = () => {
  return (
    <Navbar
      expand="lg"
      className="bg-white shadow-sm py-2 mb-5 mt-3 mx-auto rounded-pill"
      style={{ maxWidth: "1200px" }}
    >
      <Container
        fluid="lg"
        className="d-flex align-items-center justify-content-between"
      >
        {/* Logo */}
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <img src={Logo} alt="SelectCode Logo" height="40" className="ms-2" />
        </Navbar.Brand>

        {/* Navigation Links */}
        <Nav className="mx-auto d-none d-lg-flex">
          <Nav.Link href="#truform" className="text-dark fw-medium mx-3">
            Truform
          </Nav.Link>
          <Nav.Link href="#crm" className="text-dark fw-medium mx-3">
            CRM
          </Nav.Link>
          <Nav.Link href="#privacy" className="text-dark fw-medium mx-3">
            Privacy Policy
          </Nav.Link>
          <Nav.Link href="#support" className="text-dark fw-medium mx-3">
            Support
          </Nav.Link>
        </Nav>

        {/* Action Buttons */}
        <Nav className="d-flex align-items-center me-2">
          <Button
            variant="light"
            className="rounded-circle p-2 me-2 border-0 shadow-sm"
            style={{ width: "40px", height: "40px" }}
          >
            <Settings size={20} className="text-secondary" />
          </Button>
          <Button
            variant="light"
            className="rounded-circle p-2 border-0 shadow-sm"
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: "#f1f3f5",
            }}
          >
            <User size={20} className="text-secondary" />
          </Button>
        </Nav>
      </Container>
    </Navbar>
  );
};

export default WhiteHeader;
