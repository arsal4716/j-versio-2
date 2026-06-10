// frontend/src/pages/Unauthorized/Unauthorized.jsx
import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { ShieldOff, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
      <Card className="text-center shadow" style={{ maxWidth: '400px' }}>
        <Card.Body className="p-5">
          <ShieldOff size={64} className="text-danger mb-3" />
          <Card.Title className="mb-3">Access Denied</Card.Title>
          <Card.Text className="text-muted mb-4">
            You don't have permission to access this page. 
            This area is restricted to super administrators only.
          </Card.Text>
          <Button as={Link} to="/" variant="primary" className="d-flex align-items-center gap-2 mx-auto">
            <Home size={18} />
            Back to Home
          </Button>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Unauthorized;