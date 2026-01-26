import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Alert,
  Spinner,
  Pagination,
  ButtonGroup,
  Dropdown,
} from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { FileText } from "lucide-react";
import {
  getFormSetupsList,
  deleteFormSetup,
  getCampaignsForCenter,
  getFormSetup,
  resetCurrent,
  clearCampaigns,
} from "../../../store/slices/formSetupSlice";
import { getCenters } from "../../../store/slices/centerSlice";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  RefreshCw,
  Download,
  Copy,
} from "lucide-react";
import Swal from "sweetalert2";
import FormSetupModal from "./FormSetupModal";
import FormSetupFilters from "./FormSetupFilters";

const FormSetupsPage = () => {
  const dispatch = useDispatch();

  // Redux selectors
  const {
    list: formSetups,
    loading,
    error,
    campaigns,
    campaignsLoading,
    pagination,
  } = useSelector((state) => state.formSetup);
  const { centers, loading: centersLoading } = useSelector(
    (state) => state.centers,
  );

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCenter, setSelectedCenter] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [modalShow, setModalShow] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedFormSetup, setSelectedFormSetup] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load initial data
  useEffect(() => {
    dispatch(getCenters());
    loadFormSetups();
  }, [dispatch]);

  // Load form setups with filters
  const loadFormSetups = useCallback(() => {
    const params = {
      page: currentPage,
      limit: itemsPerPage,
      ...(selectedCenter && { centerId: selectedCenter }),
      ...(selectedCampaign && { campaignName: selectedCampaign }),
      ...(searchTerm && { search: searchTerm }),
    };
    dispatch(getFormSetupsList(params));
  }, [
    currentPage,
    itemsPerPage,
    selectedCenter,
    selectedCampaign,
    searchTerm,
    dispatch,
  ]);

  // Handle center change
const handleCenterChange = (centerId) => {
  console.log("CENTER CHANGED:", centerId);

  setSelectedCenter(centerId);
  setSelectedCampaign("");
  dispatch(clearCampaigns());

  const center = centers.find((c) => c._id === centerId);
  console.log("FOUND CENTER:", center);

  if (center) {
    dispatch(
      getCampaignsForCenter({
        centerId: center._id,
        verificationCode: center.verificationCode,
      }),
    );
  }
};

  const handleCampaignChange = (campaignName) => {
      console.log("CAMPAIGN SELECTED:", campaignName);

  setSelectedCampaign(campaignName);

  if (campaignName && selectedCenter) {
    dispatch(
      getFormSetup({
        centerId: selectedCenter,
        campaignName,
      }),
    );
  }
};


  const handleCreateNew = () => {
    if (!selectedCenter || !selectedCampaign) {
      Swal.fire({
        icon: "warning",
        title: "Select Center & Campaign",
        text: "Please select both a center and campaign first",
      });
      return;
    }
    setModalMode("create");
    setSelectedFormSetup(null);
    setModalShow(true);
  };

  // Handle edit
  const handleEdit = (formSetup) => {
    setModalMode("edit");
    setSelectedFormSetup(formSetup);
    setModalShow(true);
  };

  // Handle delete
  const handleDelete = (id, centerName, campaignName) => {
    Swal.fire({
      title: "Delete Form Setup?",
      html: `Are you sure you want to delete form setup for<br>
             <strong>${centerName}</strong> - <strong>${campaignName}</strong>?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(deleteFormSetup(id));
        Swal.fire("Deleted!", "Form setup has been deleted.", "success");
      }
    });
  };

  // Handle view details
  const handleViewDetails = (formSetup) => {
    Swal.fire({
      title: "Form Setup Details",
      html: `
        <div style="text-align: left;">
          <p><strong>Center:</strong> ${formSetup.centerId?.name || formSetup.centerId}</p>
          <p><strong>Campaign:</strong> ${formSetup.campaignName}</p>
          <p><strong>Lander URL:</strong> <a href="${formSetup.landerUrl}" target="_blank">${formSetup.landerUrl}</a></p>
          <p><strong>Fields:</strong> ${formSetup.fields?.length || 0}</p>
          <p><strong>Created:</strong> ${new Date(formSetup.createdAt).toLocaleDateString()}</p>
        </div>
      `,
      showCloseButton: true,
      showConfirmButton: false,
    });
  };

  // Handle duplicate
  const handleDuplicate = (formSetup) => {
    const duplicateData = {
      ...formSetup,
      campaignName: `${formSetup.campaignName} - Copy`,
      _id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    };

    setModalMode("create");
    setSelectedFormSetup(duplicateData);
    setModalShow(true);
  };

  // Filter centers based on search
  const filteredCenters = centers.filter(
    (center) =>
      !searchTerm ||
      center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.verificationCode.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Pagination
  const totalPages = Math.ceil(pagination.total / itemsPerPage);
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Render pagination
  const renderPagination = () => {
    const items = [];
    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item
          key={number}
          active={number === currentPage}
          onClick={() => handlePageChange(number)}
        >
          {number}
        </Pagination.Item>,
      );
    }

    return (
      <div className="d-flex justify-content-center mt-4">
        <Pagination>
          <Pagination.First
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          />
          <Pagination.Prev
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          />
          {items}
          <Pagination.Next
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          />
          <Pagination.Last
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          />
        </Pagination>
      </div>
    );
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4 mt-5">
        <Col>
          <h2>Form Setups Management</h2>
          <p className="text-muted mt-5">
            Manage form configurations for all centers and campaigns
          </p>
        </Col>
        <Col className="d-flex justify-content-end gap-2">
          <Button
            variant="outline-secondary"
            onClick={loadFormSetups}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "me-2 spin" : "me-2"} />
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateNew}
            disabled={!selectedCenter || !selectedCampaign}
          >
            <Plus size={18} className="me-2" />
            Create New Setup
          </Button>
        </Col>
      </Row>

      {/* Filters */}
      <FormSetupFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        centers={filteredCenters}
        selectedCenter={selectedCenter}
        onCenterChange={(e) => handleCenterChange(e.target.value)}
        campaigns={campaigns}
        selectedCampaign={selectedCampaign}
        onCampaignChange={(e) => handleCampaignChange(e.target.value)}
        loadingCenters={centersLoading}
        loadingCampaigns={campaignsLoading}
      />

      {/* Error Display */}
      {error && (
        <Alert variant="danger" className="mb-4">
          {error.message || "An error occurred"}
          <Button
            variant="outline-danger"
            size="sm"
            className="ms-3"
            onClick={loadFormSetups}
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading form setups...</p>
        </div>
      )}

      {/* Form Setups Table */}
      {!loading && formSetups.length > 0 && (
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Form Setups</strong>
              <Badge bg="secondary" className="ms-2">
                {pagination.total} total
              </Badge>
            </div>
            <small>
              Showing {formSetups.length} of {pagination.total}
            </small>
          </Card.Header>
          <Card.Body className="p-0">
            <Table hover responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Center</th>
                  <th>Campaign</th>
                  <th>Lander URL</th>
                  <th>Fields</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {formSetups.map((setup) => (
                  <tr key={setup._id}>
                    <td>
                      <div>
                        <strong>
                          {setup.centerId?.name || setup.centerId}
                        </strong>
                        <div className="text-muted small">
                          {setup.centerId?.verificationCode}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge bg="info">{setup.campaignName}</Badge>
                    </td>
                    <td>
                      <div
                        className="text-truncate"
                        style={{ maxWidth: "200px" }}
                      >
                        <a
                          href={setup.landerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-decoration-none"
                        >
                          {setup.landerUrl}
                        </a>
                      </div>
                    </td>
                    <td>
                      <Badge
                        bg={setup.fields?.length > 0 ? "success" : "warning"}
                      >
                        {setup.fields?.length || 0} fields
                      </Badge>
                    </td>
                    <td>
                      <Badge bg="success">Active</Badge>
                    </td>
                    <td>
                      <small>
                        {new Date(setup.createdAt).toLocaleDateString()}
                      </small>
                    </td>
                    <td>
                      <ButtonGroup size="sm">
                        <Button
                          variant="outline-info"
                          onClick={() => handleViewDetails(setup)}
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="outline-primary"
                          onClick={() => handleEdit(setup)}
                        >
                          <Edit size={14} />
                        </Button>
                        <Dropdown as={ButtonGroup}>
                          <Dropdown.Toggle split variant="outline-secondary">
                            <MoreVertical size={14} />
                          </Dropdown.Toggle>
                          <Dropdown.Menu>
                            <Dropdown.Item
                              onClick={() => handleDuplicate(setup)}
                            >
                              <Copy size={14} className="me-2" /> Duplicate
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item
                              onClick={() =>
                                handleDelete(
                                  setup._id,
                                  setup.centerId?.name || setup.centerId,
                                  setup.campaignName,
                                )
                              }
                              className="text-danger"
                            >
                              <Trash2 size={14} className="me-2" /> Delete
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </ButtonGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
          <Card.Footer>{renderPagination()}</Card.Footer>
        </Card>
      )}

      {/* Empty State */}
      {!loading && formSetups.length === 0 && (
        <Card>
          <Card.Body className="text-center py-5">
            <div className="mb-3">
              <FileText size={48} className="text-muted" />
            </div>
            <h5>No Form Setups Found</h5>
            <p className="text-muted mb-4">
              {selectedCenter || selectedCampaign || searchTerm
                ? "No form setups match your filters. Try changing your search criteria."
                : "Get started by creating your first form setup."}
            </p>
            <Button
              variant="primary"
              onClick={handleCreateNew}
              disabled={!selectedCenter || !selectedCampaign}
            >
              <Plus size={18} className="me-2" />
              Create First Setup
            </Button>
          </Card.Body>
        </Card>
      )}

      {/* Modal */}
      <FormSetupModal
        show={modalShow}
        onHide={() => {
          setModalShow(false);
          setSelectedFormSetup(null);
          dispatch(resetCurrent());
        }}
        mode={modalMode}
        formSetup={selectedFormSetup}
        centerId={selectedCenter}
        campaignName={selectedCampaign}
        onSuccess={loadFormSetups}
      />
    </Container>
  );
};

export default FormSetupsPage;
