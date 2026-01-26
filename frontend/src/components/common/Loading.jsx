import React from 'react';
import { Spinner } from 'react-bootstrap';

const Loading = ({ message = 'Loading...', size = 'md' }) => {
  const spinnerSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : undefined;
  
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <Spinner 
        animation="border" 
        role="status" 
        variant="primary"
        size={spinnerSize}
      >
        <span className="visually-hidden">{message}</span>
      </Spinner>
      {message && <p className="mt-2 text-muted">{message}</p>}
    </div>
  );
};

export default Loading;