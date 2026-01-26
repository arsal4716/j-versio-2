import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import Layout from "../../components/layout/Layout";
import Button from "../../components/Button/Button";
import { FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa";

const Home = () => {
  return (
    <Layout>
      <section className="hero-section d-flex align-items-center justify-content-center text-center">
        <Container>
          <Row>
            <Col lg={12}>
              <h1 className="hero-title mb-4">
                A Compliance Made for{" "}<br></br>
                <span className="text-gradient">Call Centers</span>, Powered By{" "}
                <span className="text-gradient">AI</span>
              </h1>

              <p className="hero-subtitle mb-5 fs-9">
                The AI Compliance that keeps you 100% TCPA Compliant, Safe,
                Confident and always Ready.
              </p>

              <div className="hero-buttons mb-4">
                <Button variant="primary" size="md" className="me-3 px-3">
                  Our Pricing
                </Button>
                <Button variant="outline-dark" size="md" className="px-3">
                  Try For Free
                </Button>
              </div>

              <div className="social-links mt-4">
                <a href="#" className="social-icon mx-3">
                  <FaFacebookF />
                </a>
                <a href="#" className="social-icon mx-3">
                  <FaInstagram />
                </a>
                <a href="#" className="social-icon mx-3">
                  <FaLinkedinIn />
                </a>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
};

export default Home;
