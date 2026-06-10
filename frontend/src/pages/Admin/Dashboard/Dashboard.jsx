import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Container, Badge, Table, Spinner } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { getCenters } from '../../../store/slices/centerSlice';
import { Building, Activity, FileText, Users, TrendingUp } from 'lucide-react';
import { formSetupService } from '../../../services/formSetupService';

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { centers, loading: centersLoading, total: totalCenters } = useSelector((state) => state.centers);
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState({
    totalCenters: 0,
    totalCampaigns: 0,
    totalFormSetups: 0,
    totalUsers: 0,
    loading: true
  });

  useEffect(() => {
    dispatch(getCenters({ page: 1, limit: 5 }));
    fetchStats();
  }, [dispatch]);

  const fetchStats = async () => {
    try {
      const centersRes = await dispatch(getCenters({ page: 1, limit: 1 }));
      const totalCenters = centersRes.payload?.total || 0;
      
      let totalCampaigns = 0;
      if (centersRes.payload?.centers) {
        totalCampaigns = centersRes.payload.centers.reduce((acc, center) => 
          acc + (center.campaigns?.length || 0), 0);
      }      const formSetupsRes = await formSetupService.getAll();
      const totalFormSetups = formSetupsRes.data?.total || 0;

  

      setStats({
        totalCenters,
        totalCampaigns,
        totalFormSetups,
        totalUsers: 0, 
        loading: false
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const dashboardStats = [
    {
      title: 'Total Centers',
      value: stats.totalCenters,
      icon: <Building size={24} />,
      color: 'primary',
      change: '+0%' 
    },
    {
      title: 'Active Campaigns',
      value: stats.totalCampaigns,
      icon: <Activity size={24} />,
      color: 'success',
      change: '+0%'
    },
    {
      title: 'Form Setups',
      value: stats.totalFormSetups,
      icon: <FileText size={24} />,
      color: 'info',
      change: '+0%'
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <Users size={24} />,
      color: 'warning',
      change: '+0%'
    }
  ];

  return (
    <Container fluid>
      <Card className="mb-4 mt-5 border-0 shadow-sm" bg="primary" text="white">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={8}>
              <h1 className="h3 mb-2">Welcome back, {user?.name || 'Admin'}!</h1>
              <p className="mb-0 opacity-75">
                Here's what's happening with your centers today.
              </p>
            </Col>
            <Col md={4} className="text-md-end">
              <Badge bg="light" text="dark" className="fs-6 p-2">
                {user?.roles?.includes('super_admin') ? 'Super Admin' : 'Admin'}
              </Badge>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Stats Cards */}
      {stats.loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading statistics...</p>
        </div>
      ) : (
        <Row className="mb-4 g-4">
          {dashboardStats.map((stat, index) => (
            <Col key={index} xs={12} sm={6} lg={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="text-muted mb-2">{stat.title}</h6>
                      <h2 className="mb-0">{stat.value}</h2>
                      <small className="text-success">
                        <TrendingUp size={14} className="me-1" />
                        {stat.change} from last month
                      </small>
                    </div>
                    <div className={`p-3 rounded-circle bg-${stat.color}-subtle`}>
                      <div className={`text-${stat.color}`}>
                        {stat.icon}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Recent Centers */}
      <Row className="g-4">
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Recent Centers</h5>
                <Badge bg="light" text="dark">
                  {totalCenters} Total
                </Badge>
              </div>
            </Card.Header>
            <Card.Body>
              {centersLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Loading centers...</p>
                </div>
              ) : centers?.length > 0 ? (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Campaigns</th>
                        <th>Admin Email</th>
                        <th>Created</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {centers.map((center) => (
                        <tr key={center._id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="flex-shrink-0 me-2">
                                <Building size={16} className="text-primary" />
                              </div>
                              <div className="flex-grow-1">
                                <strong>{center.name}</strong>
                              </div>
                            </div>
                          </td>
                          <td>
                            <Badge bg="secondary">{center.verificationCode}</Badge>
                          </td>
                          <td>
                            <Badge bg="info">
                              {center.campaigns?.length || 0} campaigns
                            </Badge>
                          </td>
                          <td>{center.centerAdminEmail}</td>
                          <td>
                            {new Date(center.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <Badge bg="success">Active</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <Building size={48} className="text-muted mb-3" />
                  <h5>No centers found</h5>
                  <p className="text-muted">Create your first center to get started</p>
                </div>
              )}
            </Card.Body>
            <Card.Footer className="bg-white border-0">
              <div className="d-flex justify-content-center">
                <a href="/centers" className="btn btn-outline-primary btn-sm">
                  View All Centers
                </a>
              </div>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;