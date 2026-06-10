import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Badge, Modal, Form, Spinner } from 'react-bootstrap';
import { UserPlus, Mail, Building } from 'lucide-react';
import { useSelector } from 'react-redux';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { user: currentUser } = useSelector((state) => state.auth);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      super_admin: 'danger',
      admin: 'warning',
      user: 'info'
    };
    return <Badge bg={colors[role] || 'secondary'}>{role}</Badge>;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h4 className="mb-0">Users</h4>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <UserPlus size={20} /> Add User
        </Button>
      </Card.Header>

      <Card.Body>
        <Table hover responsive>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Center</th>
              <th>Campaigns</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>
                  <div className="d-flex align-items-center">
                    <Mail size={14} className="me-1" />
                    {user.email}
                  </div>
                </td>
                <td>
                  <div className="d-flex gap-1">
                    {user.roles.map(role => (
                      <div key={role}>{getRoleBadge(role)}</div>
                    ))}
                  </div>
                </td>
                <td>
                  {user.centerId ? (
                    <Badge bg="info">
                      <Building size={12} className="me-1" />
                      {user.centerId.name}
                    </Badge>
                  ) : '-'}
                </td>
                <td>
                  {user.allowedCampaigns?.map(campaign => (
                    <Badge key={campaign} bg="secondary" className="me-1">
                      {campaign}
                    </Badge>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" placeholder="user@example.com" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                {currentUser?.roles?.includes('super_admin') && (
                  <option value="super_admin">Super Admin</option>
                )}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary">Create User</Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default UserList;