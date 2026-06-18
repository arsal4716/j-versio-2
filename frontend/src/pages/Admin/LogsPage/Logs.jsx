import React, { useEffect, useState, useCallback } from "react";
import { Container, Row, Col, Card, Table, Form, Button, Badge, Spinner, Pagination } from "react-bootstrap";
import { auditLogService } from "../../../services/auditLogService";
import { formatEST } from "../../../utils/formatDate";
import { notifyError } from "../../../utils/Notifications";

const ACTION_VARIANT = {
  "user.login": "info",
  "user.create": "success",
  "user.update": "warning",
  "user.delete": "danger",
  "center.create": "success",
  "center.update": "warning",
  "center.delete": "danger",
  "submission.start": "primary",
  "submission.success": "success",
  "submission.failed": "danger",
};

const LogsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditLogService.list({ q, action, page, limit: 50 });
      const data = res.data.data;
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      notifyError(e.response?.data?.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [q, action, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0 fw-bold">Activity Logs</h4>
          <small className="text-muted">Entries are retained for 24 hours.</small>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2">
            <Col md={5}>
              <Form.Control
                placeholder="Search email, message, entity…"
                value={q}
                onChange={(e) => { setPage(1); setQ(e.target.value); }}
              />
            </Col>
            <Col md={4}>
              <Form.Select value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }}>
                <option value="">All actions</option>
                <option value="submission.start">submission.start</option>
                <option value="submission.success">submission.success</option>
                <option value="submission.failed">submission.failed</option>
                <option value="user.login">user.login</option>
                <option value="user.create">user.create</option>
                <option value="user.update">user.update</option>
                <option value="user.delete">user.delete</option>
                <option value="center.create">center.create</option>
                <option value="center.update">center.update</option>
                <option value="center.delete">center.delete</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-5 text-muted">No activity recorded.</div>
          ) : (
            <Table hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>Time (EST)</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Center</th>
                  <th>Message</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it._id}>
                    <td className="text-nowrap">{formatEST(it.createdAt)}</td>
                    <td>
                      <Badge bg={ACTION_VARIANT[it.action] || "secondary"}>{it.action}</Badge>
                    </td>
                    <td>{it.userEmail || "—"}</td>
                    <td>{it.centerId?.name || "—"}</td>
                    <td>{it.message}</td>
                    <td className="text-muted">{it.ip}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {totalPages > 1 && (
        <Pagination className="mt-3 justify-content-center">
          <Pagination.Prev disabled={page <= 1} onClick={() => setPage((p) => p - 1)} />
          <Pagination.Item active>{page}</Pagination.Item>
          <Pagination.Next disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} />
        </Pagination>
      )}
    </Container>
  );
};

export default LogsPage;
