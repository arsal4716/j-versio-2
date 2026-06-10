import React from "react";
import { Container } from "react-bootstrap";

const Footer = () => {
  return (
    <footer className="footer py-3">
      <Container className="text-center">
        <p className="text-muted small mb-0">
          © {new Date().getFullYear()} SelectCode. All rights reserved.
        </p>
      </Container>
    </footer>
  );
};

export default Footer;
