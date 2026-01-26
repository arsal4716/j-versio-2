import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import SetupFormBuilder from '../../../components/Forms/SetupForm/SetupFormBuilder';

const FormSetupModal = ({ 
  show, 
  onHide, 
  mode, 
  formSetup, 
  centerId, 
  campaignName,
  onSuccess 
}) => {
  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {mode === 'create' ? 'Create Form Setup' : 'Edit Form Setup'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <SetupFormBuilder
          existing={mode === 'edit' ? formSetup : null}
          initialCenterId={centerId}
          initialCampaignName={campaignName}
          onSuccess={() => {
            onSuccess?.();
            onHide();
          }}
          mode={mode}
        />
      </Modal.Body>
    </Modal>
  );
};

export default FormSetupModal;