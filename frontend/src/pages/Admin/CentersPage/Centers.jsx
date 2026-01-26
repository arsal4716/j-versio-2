import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Table, 
  Button, 
  Badge, 
  Form,
  InputGroup,
  Modal,
  Spinner,
  Alert,
  Pagination
} from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { 
  getCenters, 
  deleteCenter,
  setCurrentCenter 
} from '../../../store/slices/centerSlice';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Building,
  Filter,
  Download
} from 'lucide-react';
import Swal from 'sweetalert2';
import CenterForm from '../../../components/Forms/CenterForm/CenterForm';

const CentersList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { centers, loading, error, total, totalPages, currentPage } = useSelector((state) => state.centers);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    sort: 'createdAt',
    order: 'desc'
  });

  useEffect(() => {
    fetchCenters();
  }, [filters]);

  const fetchCenters = () => {
    const params = { ...filters };
    if (searchTerm) params.search = searchTerm;
    dispatch(getCenters(params));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
    fetchCenters();
  };

  const handleDelete = (center) => {
    setSelectedCenter(center);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (selectedCenter) {
      try {
        await dispatch(deleteCenter(selectedCenter._id)).unwrap();
        Swal.fire({
          title: 'Deleted!',
          text: 'Center has been deleted successfully.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        setShowDeleteModal(false);
        setSelectedCenter(null);
        fetchCenters();
      } catch (error) {
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to delete center.',
          icon: 'error'
        });
      }
    }
  };

  const handleEdit = (center) => {
    dispatch(setCurrentCenter(center));
    navigate(`/centers/edit/${center._id}`);
  };

  const handleView = (center) => {
    dispatch(setCurrentCenter(center));
    navigate(`/centers/view/${center._id}`);
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, filters.page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item 
          key={i} 
          active={i === filters.page}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    return (
      <Pagination className="mb-0">
        <Pagination.Prev 
          disabled={filters.page === 1} 
          onClick={() => handlePageChange(filters.page - 1)}
        />
        {items}
        <Pagination.Next 
          disabled={filters.page === totalPages} 
          onClick={() => handlePageChange(filters.page + 1)}
        />
      </Pagination>
    );
  };

  return (
    <Container fluid>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-2 mt-5">Centers Management</h1>
              <p className="text-muted mb-0">
                Manage all centers, campaigns, and their configurations
              </p>
            </div>
            <Button 
              variant="primary" 
              onClick={() => navigate('/centers/new')}
              className="d-flex align-items-center"
            >
              <Plus size={20} className="me-2" />
              New Center
            </Button>
          </div>
        </Col>
      </Row>

      {/* Stats & Filters */}
      <Row className="mb-4">
        <Col md={8}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Form onSubmit={handleSearch}>
                <InputGroup>
                  <InputGroup.Text>
                    <Search size={18} />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search centers by name, code, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button variant="outline-secondary" type="submit">
                    Search
                  </Button>
                </InputGroup>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center justify-content-around">
              <div className="text-center">
                <h3 className="mb-0">{total || 0}</h3>
                <small className="text-muted">Total Centers</small>
              </div>
              <div className="text-center">
                <h3 className="mb-0">
                  {centers?.reduce((acc, c) => acc + (c.campaigns?.length || 0), 0)}
                </h3>
                <small className="text-muted">Total Campaigns</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Centers Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center">
          <h5 className="mb-0">All Centers</h5>
          <div className="d-flex gap-2">
            <Form.Select size="sm" style={{ width: 'auto' }}>
              <option>Sort by: Newest</option>
              <option>Sort by: Name A-Z</option>
            </Form.Select>
            <Button variant="outline-primary" size="sm" className="d-flex align-items-center">
              <Download size={16} className="me-1" />
              Export
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible>
              {error.message || 'Failed to load centers'}
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading centers...</p>
            </div>
          ) : centers?.length > 0 ? (
            <>
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Center</th>
                      <th>Verification Code</th>
                      <th>Admin Email</th>
                      <th>Campaigns</th>
                      <th>Proxy</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {centers.map((center) => (
                      <tr key={center._id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="flex-shrink-0 me-3">
                              <div className="bg-primary bg-opacity-10 p-2 rounded">
                                <Building size={20} className="text-primary" />
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <strong>{center.name}</strong>
                              <div className="small text-muted">ID: {center._id}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge bg="dark" className="fs-6">
                            {center.verificationCode}
                          </Badge>
                        </td>
                        <td>{center.centerAdminEmail}</td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {center.campaigns?.slice(0, 2).map((campaign) => (
                              <Badge key={campaign._id} bg="info" className="mb-1">
                                {campaign.name}
                              </Badge>
                            ))}
                            {center.campaigns?.length > 2 && (
                              <Badge bg="secondary">
                                +{center.campaigns.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td>
                          <Badge bg={center.proxy?.provider ? 'success' : 'secondary'}>
                            {center.proxy?.provider || 'None'}
                          </Badge>
                        </td>
                        <td>
                          {new Date(center.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => handleView(center)}
                              title="View Details"
                            >
                              <Eye size={16} />
                            </Button>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEdit(center)}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(center)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-4">
                  <div>
                    Showing {(filters.page - 1) * filters.limit + 1} to{' '}
                    {Math.min(filters.page * filters.limit, total)} of {total} centers
                  </div>
                  <div>
                    {renderPagination()}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-5">
              <Building size={64} className="text-muted mb-3" />
              <h5>No centers found</h5>
              <p className="text-muted mb-4">
                {searchTerm ? 'Try a different search term' : 'Get started by creating your first center'}
              </p>
              <Button variant="primary" onClick={() => navigate('/centers/new')}>
                <Plus size={20} className="me-2" />
                Create Center
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="mb-0">
            <p className="mb-0">
              Are you sure you want to delete <strong>{selectedCenter?.name}</strong>?
            </p>
            <p className="mb-0 mt-2">
              This will also delete all associated campaigns, form setups, and users.
              This action cannot be undone.
            </p>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete Center
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

const CenterFormPage = () => {
  const navigate = useNavigate();
  const { currentCenter } = useSelector((state) => state.centers);
  const location = useLocation();
  const isEditMode = location.pathname.includes('/edit/');

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate('/centers')}
                className="mb-3"
              >
                ← Back to Centers
              </Button>
              <h1 className="h3 mb-2">
                {isEditMode ? 'Edit Center' : 'Create New Center'}
              </h1>
              <p className="text-muted mb-0">
                {isEditMode 
                  ? 'Update center details and configurations' 
                  : 'Add a new center with campaigns and settings'}
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col lg={10} xl={8}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <CenterForm 
                center={isEditMode ? currentCenter : null}
                onSuccess={() => navigate('/centers')}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

const CenterDetailPage = () => {
  const navigate = useNavigate();
  const { currentCenter } = useSelector((state) => state.centers);

  if (!currentCenter) {
    return (
      <Container fluid>
        <Alert variant="warning">
          Center not found. <Button variant="link" onClick={() => navigate('/centers')}>Go back</Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate('/centers')}
                className="mb-3"
              >
                ← Back to Centers
              </Button>
              <h1 className="h3 mb-2">{currentCenter.name}</h1>
              <p className="text-muted mb-0">
                Center ID: {currentCenter._id} | Created: {new Date(currentCenter.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Button 
              variant="primary"
              onClick={() => navigate(`/centers/edit/${currentCenter._id}`)}
            >
              <Edit size={20} className="me-2" />
              Edit Center
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="">
        {/* Basic Information */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Basic Information</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <div className="small text-muted">Center Name</div>
                  <div className="fw-semibold">{currentCenter.name}</div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="small text-muted">Verification Code</div>
                  <Badge bg="dark" className="fs-6">
                    {currentCenter.verificationCode}
                  </Badge>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="small text-muted">Admin Email</div>
                  <div>{currentCenter.centerAdminEmail}</div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="small text-muted">Phone</div>
                  <div>{currentCenter.phone || 'Not set'}</div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* Campaigns */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Campaigns</h5>
              <Badge bg="info">
                {currentCenter.campaigns?.length || 0} campaigns
              </Badge>
            </Card.Header>
            <Card.Body>
              {currentCenter.campaigns?.length > 0 ? (
                <div className="list-group">
                  {currentCenter.campaigns.map((campaign) => (
                    <div key={campaign._id} className="list-group-item border-0 px-0 py-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{campaign.name}</h6>
                          <small className="text-muted">
                            Sheet: {campaign.sheetTabId}
                          </small>
                        </div>
                        <Badge bg={campaign.isActive ? 'success' : 'secondary'}>
                          {campaign.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">No campaigns configured</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Proxy Configuration */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Proxy Configuration</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <div className="small text-muted">Provider</div>
                  <div>{currentCenter.proxy?.provider || 'Not set'}</div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="small text-muted">Username</div>
                  <div>{currentCenter.proxy?.username || 'Not set'}</div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="small text-muted">Type</div>
                  <div>{currentCenter.proxy?.type || 'Not set'}</div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* Google Sheets */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Google Sheets</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <div className="small text-muted">Master Sheet ID</div>
                  <div className="text-truncate">
                    {currentCenter.googleSheets?.masterSheetId || 'Not set'}
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="small text-muted">Admin Sheet ID</div>
                  <div className="text-truncate">
                    {currentCenter.googleSheets?.adminSheetId || 'Not set'}
                  </div>
                </Col>
                <Col md={12} className="mb-3">
                  <div className="small text-muted">Client Key File</div>
                  <div>
                    {currentCenter.googleSheets?.clientKeyFile ? (
                      <Badge bg="success">Uploaded</Badge>
                    ) : (
                      <Badge bg="secondary">Not uploaded</Badge>
                    )}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* Settings */}
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Settings</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3} className="mb-3">
                  <div className="small text-muted">Typing Speed</div>
                  <div>{currentCenter.settings?.typingSpeed || 800}ms</div>
                </Col>
                <Col md={3} className="mb-3">
                  <div className="small text-muted">Stay Open Time</div>
                  <div>{currentCenter.settings?.stayOpenTime || 9}s</div>
                </Col>
                <Col md={3} className="mb-3">
                  <div className="small text-muted">Device Distribution</div>
                  <div>
                    Desktop: {currentCenter.settings?.deviceDistribution?.desktop || 60}%<br />
                    Tablet: {currentCenter.settings?.deviceDistribution?.tablet || 20}%<br />
                    Mobile: {currentCenter.settings?.deviceDistribution?.mobile || 20}%
                  </div>
                </Col>
                <Col md={3} className="mb-3">
                  <div className="small text-muted">Referrers</div>
                  <div>
                    {currentCenter.settings?.referrers?.length || 0} configured
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

const CentersPage = () => {
  return (
    <Routes>
      <Route path="/" element={<CentersList />} />
      <Route path="/new" element={<CenterFormPage />} />
      <Route path="/edit/:id" element={<CenterFormPage />} />
      <Route path="/view/:id" element={<CenterDetailPage />} />
    </Routes>
  );
};

export default CentersPage;