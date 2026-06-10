import React from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import Button from "../Button/Button";
import Logo from "../../assets/SelectCode.png";

const navLinks = [
  { label: "Truform", to: "/truform" },
  { label: "What we do?", to: "/what-we-do" },
  { label: "Tools for you", to: "/tools" },
  { label: "Talk to us", to: "/contact" },
];

const Header = () => {
  return (
    <Navbar bg="transparent" expand="lg" fixed="top" className="py-3">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold fs-3">
          <img src={Logo} alt="SelectCode Logo" height="40" />
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" className="border-0" />

        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            {navLinks.map((link, index) => (
              <Nav.Link
                as={Link}
                key={index}
                to={link.to}
                className="fw-thin mx-3 text-dark"
              >
                {link.label}
              </Nav.Link>
            ))}

            <Nav.Link
              as={Link}
              to="/login"
              className="fw-semibold mx-3 text-dark"
            >
              Login
            </Nav.Link>
            <Link to="/signup">
            <Button
              variant="primary"
              size="sm"
              className="ms-3 px-4"
            >
              Signup
            </Button>
            </Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
