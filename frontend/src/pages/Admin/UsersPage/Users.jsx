// frontend/src/pages/Admin/UsersPage/Users.jsx
import React, { useState, useEffect } from "react";
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
  Dropdown,
} from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  setCurrentUser,
} from "../../../store/slices/userSlice";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter,
  User,
  Shield,
  Mail,
  Calendar,
  Building,
} from "lucide-react";
import Swal from "sweetalert2";
import { getAllCampaigns } from "../../../store/slices/campaignSlice";

const UsersList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { users, loading, error, total } = useSelector((state) => state.users);
  const { centers } = useSelector((state) => state.centers);

  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    const params = {};
    if (searchTerm) params.search = searchTerm;
    dispatch(getUsers(params));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleDelete = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (selectedUser) {
      try {
        await dispatch(deleteUser(selectedUser._id)).unwrap();
        Swal.fire({
          title: "Deleted!",
          text: "User has been deleted successfully.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        setShowDeleteModal(false);
        setSelectedUser(null);
        fetchUsers();
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: error.message || "Failed to delete user.",
          icon: "error",
        });
      }
    }
  };

  const handleEdit = (user) => {
    dispatch(setCurrentUser(user));
    navigate(`/users/edit/${user._id}`);
  };

  const handleView = (user) => {
    dispatch(setCurrentUser(user));
    navigate(`/users/view/${user._id}`);
  };

  const getRoleBadge = (roles) => {
    if (!roles || !Array.isArray(roles))
      return <Badge bg="secondary">Unknown</Badge>;

    if (roles.includes("super_admin"))
      return <Badge bg="danger">Super Admin</Badge>;
    if (roles.includes("admin")) return <Badge bg="primary">Admin</Badge>;
    return <Badge bg="info">User</Badge>;
  };

  const getCenterName = (centerId) => {
    if (!centerId) return "No Center";
    const center = centers.find((c) => c._id === centerId);
    return center ? center.name : "Unknown Center";
  };

  return (
    <Container fluid>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-2 mt-5">Users Management</h1>
              <p className="text-muted mb-0">
                Manage all users, their roles and permissions
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate("/users/new")}
              className="d-flex align-items-center"
            >
              <Plus size={20} className="me-2" />
              New User
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
                    placeholder="Search users by name, email, or company..."
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
                <small className="text-muted">Total Users</small>
              </div>
              <div className="text-center">
                <h3 className="mb-0">
                  {users?.filter((u) => u.roles?.includes("super_admin"))
                    .length || 0}
                </h3>
                <small className="text-muted">Super Admins</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Users Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center">
          <h5 className="mb-0">All Users</h5>
          <div className="d-flex gap-2">
            <Form.Select size="sm" style={{ width: "auto" }}>
              <option>All Roles</option>
              <option>Super Admin</option>
              <option>Admin</option>
              <option>User</option>
            </Form.Select>
          </div>
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible>
              {error.message || "Failed to load users"}
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading users...</p>
            </div>
          ) : users?.length > 0 ? (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Company</th>
                    <th>Center</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="flex-shrink-0 me-3">
                            <div className="bg-primary bg-opacity-10 p-2 rounded">
                              <User size={20} className="text-primary" />
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <strong>{user.name}</strong>
                            <div className="small text-muted">
                              ID: {user._id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.company || "-"}</td>
                      <td>
                        {user.centerId ? (
                          <Badge bg="secondary">
                            {getCenterName(user.centerId)}
                          </Badge>
                        ) : (
                          <span className="text-muted">No Center</span>
                        )}
                      </td>
                      <td>{getRoleBadge(user.roles)}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => handleView(user)}
                            title="View Details"
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleEdit(user)}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(user)}
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
          ) : (
            <div className="text-center py-5">
              <User size={64} className="text-muted mb-3" />
              <h5>No users found</h5>
              <p className="text-muted mb-4">
                {searchTerm
                  ? "Try a different search term"
                  : "Get started by creating your first user"}
              </p>
              <Button variant="primary" onClick={() => navigate("/users/new")}>
                <Plus size={20} className="me-2" />
                Create User
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="mb-0">
            <p className="mb-0">
              Are you sure you want to delete{" "}
              <strong>{selectedUser?.name}</strong>?
            </p>
            <p className="mb-0 mt-2">
              This user will no longer be able to access the system. This action
              cannot be undone.
            </p>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete User
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

const UserFormPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state) => state.users);
  const { centers } = useSelector((state) => state.centers);
  const location = useLocation();
  const isEditMode = location.pathname.includes("/edit/");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: "",
    roles: ["user"],
    centerId: "",
    allowedCampaigns: [],
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [centerCampaigns, setCenterCampaigns] = useState([]); // campaigns for selected center

  // Populate form in edit mode
  useEffect(() => {
    if (isEditMode && currentUser) {
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || "",
        company: currentUser.company || "",
        password: "",
        confirmPassword: "",
        roles: currentUser.roles || ["user"],
        centerId: currentUser.centerId || "",
        allowedCampaigns: currentUser.allowedCampaigns || [],
      });
    }
  }, [currentUser, isEditMode]);

  useEffect(() => {
    if (formData.centerId) {
      const selectedCenter = centers.find((c) => c._id === formData.centerId);
      if (selectedCenter) {
        dispatch(
          getAllCampaigns({
            centerId: formData.centerId,
            verificationCode: selectedCenter.verificationCode,
          }),
        )
          .unwrap()
          .then((res) => {
            setCenterCampaigns(res || []);
            setFormData((prev) => ({
              ...prev,
              allowedCampaigns: prev.allowedCampaigns.filter((ac) =>
                (res || []).some((c) => c.name === ac),
              ),
            }));
          })
          .catch(() => setCenterCampaigns([]));
      }
    } else {
      setCenterCampaigns([]);
      setFormData((prev) => ({ ...prev, allowedCampaigns: [] }));
    }
  }, [formData.centerId, centers, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Email is invalid";
    if (!isEditMode) {
      if (!formData.password) newErrors.password = "Password is required";
      if (formData.password.length < 6)
        newErrors.password = "Password must be at least 6 characters";
      if (formData.password !== formData.confirmPassword)
        newErrors.confirmPassword = "Passwords do not match";
    }
    if (!formData.roles.length)
      newErrors.roles = "At least one role is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        company: formData.company,
        roles: formData.roles,
        centerId: formData.centerId || null,
        allowedCampaigns: formData.allowedCampaigns,
      };
      if (!isEditMode || formData.password)
        userData.password = formData.password;

      if (isEditMode) {
        await dispatch(updateUser({ id: currentUser._id, userData })).unwrap();
        Swal.fire({
          title: "Success!",
          text: "User updated successfully.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await dispatch(createUser(userData)).unwrap();
        Swal.fire({
          title: "Success!",
          text: "User created successfully.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }

      navigate("/users");
    } catch (error) {
      setErrors({ submit: error.message || "Failed to save user" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Button
                variant="outline-secondary"
                onClick={() => navigate("/users")}
                className="mb-3"
              >
                ← Back to Users
              </Button>
              <h1 className="h3 mb-2">
                {isEditMode ? "Edit User" : "Create New User"}
              </h1>
              <p className="text-muted mb-0">
                {isEditMode
                  ? "Update user details and permissions"
                  : "Add a new user to the system"}
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              {errors.submit && (
                <Alert variant="danger" dismissible>
                  {errors.submit}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {/* Name & Email */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Full Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        isInvalid={!!errors.name}
                        placeholder="Enter full name"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.name}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email *</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        isInvalid={!!errors.email}
                        placeholder="Enter email"
                        disabled={isEditMode}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.email}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Company & Center */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Company</Form.Label>
                      <Form.Control
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="Enter company name"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Center</Form.Label>
                      <Form.Select
                        name="centerId"
                        value={formData.centerId}
                        onChange={handleChange}
                      >
                        <option value="">Select a center (optional)</option>
                        {centers.map((center) => (
                          <option key={center._id} value={center._id}>
                            {center.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Campaigns */}
                {formData.centerId && (
                  <Form.Group className="mb-3">
                    <Form.Label>Allowed Campaigns</Form.Label>
                    {centerCampaigns.length === 0 ? (
                      <p className="text-muted">
                        No campaigns available for this center
                      </p>
                    ) : (
                      centerCampaigns.map((c) => (
                        <Form.Check
                          key={c._id}
                          type="checkbox"
                          label={c.name}
                          checked={formData.allowedCampaigns.includes(c.name)}
                          onChange={() => {
                            setFormData((prev) => {
                              const updated = prev.allowedCampaigns.includes(
                                c.name,
                              )
                                ? prev.allowedCampaigns.filter(
                                    (ac) => ac !== c.name,
                                  )
                                : [...prev.allowedCampaigns, c.name];
                              return { ...prev, allowedCampaigns: updated };
                            });
                          }}
                        />
                      ))
                    )}
                  </Form.Group>
                )}

                {/* Password */}
                {(!isEditMode || formData.password) && (
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          {isEditMode ? "New Password" : "Password *"}
                        </Form.Label>
                        <Form.Control
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          isInvalid={!!errors.password}
                          placeholder={
                            isEditMode
                              ? "Leave blank to keep current"
                              : "Enter password"
                          }
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.password}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Confirm Password {!isEditMode && "*"}
                        </Form.Label>
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          isInvalid={!!errors.confirmPassword}
                          placeholder="Confirm password"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.confirmPassword}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                {/* Roles */}
                <Form.Group className="mb-3">
                  <Form.Label>Roles *</Form.Label>
                  <div>
                    {/* Super Admin */}
                    <Form.Check
                      inline
                      type="checkbox"
                      label="Super Admin"
                      checked={formData.roles.includes("super_admin")}
                      onChange={(e) => {
                        const newRoles = e.target.checked
                          ? ["super_admin"]
                          : ["user"];
                        setFormData((prev) => ({ ...prev, roles: newRoles }));
                      }}
                    />
                    {/* Admin */}
                    <Form.Check
                      inline
                      type="checkbox"
                      label="Admin"
                      checked={formData.roles.includes("admin")}
                      onChange={(e) => {
                        const newRoles = e.target.checked
                          ? [
                              ...formData.roles.filter(
                                (r) => r !== "super_admin",
                              ),
                              "admin",
                            ]
                          : formData.roles.filter((r) => r !== "admin");
                        setFormData((prev) => ({
                          ...prev,
                          roles: newRoles.length ? newRoles : ["user"],
                        }));
                      }}
                      disabled={formData.roles.includes("super_admin")}
                    />
                    {/* User */}
                    <Form.Check
                      inline
                      type="checkbox"
                      label="User"
                      checked={formData.roles.includes("user")}
                      onChange={(e) => {
                        const newRoles = e.target.checked
                          ? [
                              ...formData.roles.filter(
                                (r) => r !== "super_admin",
                              ),
                              "user",
                            ]
                          : formData.roles.filter((r) => r !== "user");
                        setFormData((prev) => ({
                          ...prev,
                          roles: newRoles.length ? newRoles : ["admin"],
                        }));
                      }}
                      disabled={formData.roles.includes("super_admin")}
                    />
                  </div>
                  {errors.roles && (
                    <div className="text-danger small">{errors.roles}</div>
                  )}
                </Form.Group>

                {/* Submit Buttons */}
                <div className="d-flex justify-content-end gap-2 mt-4">
                  <Button
                    variant="outline-secondary"
                    onClick={() => navigate("/users")}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={loading}>
                    {loading
                      ? "Saving..."
                      : isEditMode
                        ? "Update User"
                        : "Create User"}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

const UserDetailPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useSelector((state) => state.users);
  const { centers } = useSelector((state) => state.centers);

  if (!currentUser) {
    return (
      <Container fluid>
        <Alert variant="warning">
          User not found.{" "}
          <Button variant="link" onClick={() => navigate("/users")}>
            Go back
          </Button>
        </Alert>
      </Container>
    );
  }

  const getRoleBadge = (roles) => {
    if (!roles || !Array.isArray(roles))
      return <Badge bg="secondary">Unknown</Badge>;

    if (roles.includes("super_admin"))
      return <Badge bg="danger">Super Admin</Badge>;
    if (roles.includes("admin")) return <Badge bg="primary">Admin</Badge>;
    return <Badge bg="info">User</Badge>;
  };

  const getCenterName = () => {
    if (!currentUser.centerId) return "No Center";
    const center = centers.find((c) => c._id === currentUser.centerId);
    return center ? center.name : "Unknown Center";
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Button
                variant="outline-secondary"
                onClick={() => navigate("/users")}
                className="mb-3"
              >
                ← Back to Users
              </Button>
              <h1 className="h3 mb-2">{currentUser.name}</h1>
              <p className="text-muted mb-0">
                User ID: {currentUser._id} | Created:{" "}
                {new Date(currentUser.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate(`/users/edit/${currentUser._id}`)}
            >
              <Edit size={20} className="me-2" />
              Edit User
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="g-4">
        {/* Basic Information */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Basic Information</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <div className="small text-muted">Full Name</div>
                  <div className="fw-semibold">{currentUser.name}</div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="small text-muted">Email</div>
                  <div>{currentUser.email}</div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="small text-muted">Company</div>
                  <div>{currentUser.company || "Not specified"}</div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="small text-muted">Role</div>
                  <div>{getRoleBadge(currentUser.roles)}</div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* Center Information */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Center Information</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={12} className="mb-3">
                  <div className="small text-muted">Assigned Center</div>
                  <div className="fw-semibold">{getCenterName()}</div>
                </Col>
                <Col md={12} className="mb-3">
                  <div className="small text-muted">Allowed Campaigns</div>
                  <div>
                    {currentUser.allowedCampaigns?.length > 0 ? (
                      <div className="d-flex flex-wrap gap-1 mt-2">
                        {currentUser.allowedCampaigns.map((campaign, index) => (
                          <Badge key={index} bg="info">
                            {campaign}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">No campaigns assigned</span>
                    )}
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

const UsersPage = () => {
  return (
    <Routes>
      <Route path="/" element={<UsersList />} />
      <Route path="/new" element={<UserFormPage />} />
      <Route path="/edit/:id" element={<UserFormPage />} />
      <Route path="/view/:id" element={<UserDetailPage />} />
    </Routes>
  );
};

export default UsersPage;
