import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { Nav } from 'react-bootstrap';
import {
  LayoutDashboard,
  Building,
  FormInput,
  Users,
  LogOut,
  Menu,
  X,
  Settings
} from 'lucide-react';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const menuItems = [
    {
      title: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      path: '/dashboard',
      exact: true
    },
    {
      title: 'Centers',
      icon: <Building size={20} />,
      path: '/centers',
      exact: false
    },
    {
      title: 'Form Setup',
      icon: <FormInput size={20} />,
      path: '/form-setup',
      exact: false
    },
    {
      title: 'Users',
      icon: <Users size={20} />,
      path: '/users',
      exact: false
    },
    {
      title: 'Settings',
      icon: <Settings size={20} />,
      path: '/settings',
      exact: false
    }
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="d-lg-none position-fixed btn btn-primary btn-sm"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          top: '20px',
          left: '20px',
          zIndex: 1050,
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          onClick={() => setIsOpen(false)}
          style={{ zIndex: 1039 }}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`position-fixed top-0 start-0 h-100 bg-white shadow overflow-auto ${
          isOpen ? 'd-block' : 'd-none d-lg-block'
        }`}
        style={{ 
          width: '250px',
          zIndex: 1040,
          transition: 'all 0.3s'
        }}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-bottom">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h5 className="mb-0 fw-bold">Admin Panel</h5>
              <small className="text-muted">
                {user?.roles?.includes('super_admin') ? 'Super Admin' : 'Admin'}
              </small>
            </div>
            <button
              className="btn btn-sm btn-outline-secondary d-lg-none"
              onClick={() => setIsOpen(false)}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="p-3 border-bottom">
          <div className="d-flex align-items-center">
            <div className="flex-shrink-0">
              <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '40px', height: '40px' }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
            </div>
            <div className="flex-grow-1 ms-3">
              <h6 className="mb-0">{user?.name || 'Admin User'}</h6>
              <small className="text-muted">{user?.email || 'admin@example.com'}</small>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <Nav className="flex-column p-3">
          {menuItems.map((item) => (
            <Nav.Item key={item.title} className="mb-2">
              <Nav.Link
                as={Link}
                to={item.path}
                className={`d-flex align-items-center rounded ${
                  isActive(item.path, item.exact) ? 'bg-primary text-white' : 'text-dark'
                }`}
                onClick={() => setIsOpen(false)}
                style={{ padding: '0.5rem 0.75rem' }}
              >
                {item.icon}
                <span className="ms-2">{item.title}</span>
              </Nav.Link>
            </Nav.Item>
          ))}
          
          {/* Logout Button */}
          <Nav.Item className="mt-5">
            <button
              className="nav-link d-flex align-items-center text-danger w-100 border-0 bg-transparent"
              onClick={handleLogout}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <LogOut size={20} />
              <span className="ms-2">Logout</span>
            </button>
          </Nav.Item>
        </Nav>
      </div>

      {/* Spacer for sidebar on desktop */}
      <div className="d-none d-lg-block" style={{ width: '250px' }}></div>
    </>
  );
};

export default Sidebar;