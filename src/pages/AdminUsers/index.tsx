import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, Row, Col, Card, CardBody, CardHeader,
  Table, Modal, ModalHeader, ModalBody, ModalFooter,
  Button, Input, Label, Form, FormFeedback, Spinner,
} from "reactstrap";
import * as Yup from "yup";
import { useFormik } from "formik";
import { QRCodeSVG } from "qrcode.react";

import {
  getAdminUsers, updateAdminUser, deactivateAdminUser, getWalletLogs,
  AdminUser, WalletTransaction,
} from "../../helpers/adminApi";
import { showToast } from "../../helpers/appToast";

const PAGE_SIZE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: any }) => {
  const s = String(status ?? "").toUpperCase();
  if (["ACTIVE", "1", "TRUE"].includes(s))
    return <span className="badge bg-success-subtle text-success">Active</span>;
  if (["INACTIVE", "0", "FALSE", "DEACTIVATED"].includes(s))
    return <span className="badge bg-danger-subtle text-danger">Inactive</span>;
  return <span className="badge bg-secondary-subtle text-secondary">{status || "—"}</span>;
};

const RoleBadge = ({ role }: { role: string }) => {
  if (!role) return <span className="badge bg-secondary-subtle text-secondary">—</span>;
  if (role.toUpperCase() === "ADMIN")
    return <span className="badge bg-danger-subtle text-danger">Admin</span>;
  return <span className="badge bg-primary-subtle text-primary">{role}</span>;
};

const fmtWallet = (w: string | number | null) => {
  if (w === null || w === undefined || w === "") return "0.00";
  const n = parseFloat(String(w));
  return isNaN(n) ? "0.00" : n.toFixed(2);
};

const buildReferralLink = (code: string | null) =>
  code ? `${window.location.origin}/register?ref=${code}` : null;

const fmtDate = (d: string) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-MY", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    });
  } catch { return d; }
};

// ── Component ─────────────────────────────────────────────────────────────────

const AdminUsers = () => {
  const navigate = useNavigate();

  // ── Admin guard — redirect non-admins immediately ────────────────────────
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "ADMIN") {
      showToast.error("Admin access required");
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  // List state
  const [users, setUsers]                 = useState<AdminUser[]>([]);
  const [loading, setLoading]             = useState(false);
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchInput, setSearchInput]     = useState("");
  const [keyword, setKeyword]             = useState("");

  // View modal
  const [viewUser, setViewUser]       = useState<AdminUser | null>(null);
  const [viewOpen, setViewOpen]       = useState(false);
  const [copiedLink, setCopiedLink]   = useState(false);
  const [walletLogs, setWalletLogs]   = useState<WalletTransaction[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Edit modal
  const [editUser, setEditUser]       = useState<AdminUser | null>(null);
  const [editOpen, setEditOpen]       = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Deactivate modal
  const [deactivateUser, setDeactivateUser]         = useState<AdminUser | null>(null);
  const [deactivateOpen, setDeactivateOpen]         = useState(false);
  const [deactivateLoading, setDeactivateLoading]   = useState(false);

  // ── Search debounce ─────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => { setKeyword(searchInput); setPage(0); }, 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Fetch users ─────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers(page, PAGE_SIZE, keyword);
      if (res.code === 200 && res.data) {
        setUsers(res.data.content);
        setTotalPages(res.data.totalPages);
        setTotalElements(res.data.totalElements);
      } else {
        showToast.error(res.msg || "Failed to load users");
      }
    } catch {
      showToast.error("Network error — could not load users");
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── View modal ──────────────────────────────────────────────────────────────

  const openView = async (user: AdminUser) => {
    setViewUser(user);
    setViewOpen(true);
    setCopiedLink(false);
    setWalletLogs([]);
    setLogsLoading(true);
    try {
      const res = await getWalletLogs(user.id);
      if (res.code === 200 && Array.isArray(res.data)) {
        setWalletLogs(res.data);
      }
    } catch { /* show empty table */ }
    finally { setLogsLoading(false); }
  };

  const closeView = () => { setViewOpen(false); setViewUser(null); };

  const handleCopyLink = (code: string | null) => {
    const link = buildReferralLink(code);
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // ── Edit modal ──────────────────────────────────────────────────────────────

  const editFormik = useFormik({
    enableReinitialize: true,
    initialValues: {
      username: editUser?.username || "",
      email:    editUser?.email    || "",
      phone:    editUser?.phone    || "",
    },
    validationSchema: Yup.object({
      username: Yup.string().required("Username is required"),
      email:    Yup.string().email("Invalid email format").required("Email is required"),
      phone:    Yup.string(),
    }),
    onSubmit: async (values) => {
      if (!editUser) return;
      setEditLoading(true);
      try {
        const res = await updateAdminUser(editUser.id, values);
        if (res.code === 200) {
          showToast.success("User updated successfully");
          setEditOpen(false);
          fetchUsers();
        } else {
          showToast.error(res.msg || "Failed to update user");
        }
      } catch {
        showToast.error("Network error");
      } finally {
        setEditLoading(false);
      }
    },
  });

  const openEdit = (user: AdminUser) => { setEditUser(user); setEditOpen(true); };

  // ── Deactivate ──────────────────────────────────────────────────────────────

  const openDeactivate = (user: AdminUser) => { setDeactivateUser(user); setDeactivateOpen(true); };

  const confirmDeactivate = async () => {
    if (!deactivateUser) return;
    setDeactivateLoading(true);
    try {
      const res = await deactivateAdminUser(deactivateUser.id);
      if (res.code === 200) {
        showToast.success(`"${deactivateUser.username}" has been deactivated`);
        setDeactivateOpen(false);
        fetchUsers();
      } else {
        showToast.error(res.msg || "Failed to deactivate user");
      }
    } catch {
      showToast.error("Network error");
    } finally {
      setDeactivateLoading(false);
    }
  };

  // ── Pagination ──────────────────────────────────────────────────────────────

  const pageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const start = Math.max(0, Math.min(page - 2, totalPages - 5));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  };

  document.title = "User Management | Admin";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>

          {/* Breadcrumb */}
          <Row>
            <Col xs={12}>
              <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                <h4 className="mb-sm-0">User Management</h4>
                <ol className="breadcrumb m-0">
                  <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
                  <li className="breadcrumb-item active">Users</li>
                </ol>
              </div>
            </Col>
          </Row>

          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center">
                  <h5 className="card-title mb-0 flex-grow-1">
                    <i className="ri-team-line me-2 text-primary align-middle"></i>
                    All Users
                    {totalElements > 0 && (
                      <span className="badge bg-primary-subtle text-primary ms-2 fs-12">
                        {totalElements}
                      </span>
                    )}
                  </h5>
                </CardHeader>

                <CardBody>
                  {/* Search bar */}
                  <Row className="mb-3">
                    <Col sm={5}>
                      <div className="search-box">
                        <Input
                          type="text"
                          className="form-control search"
                          placeholder="Search by username, email, phone..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <i className="ri-search-line search-icon"></i>
                      </div>
                    </Col>
                  </Row>

                  {/* Table */}
                  <div className="table-responsive">
                    <Table className="table-hover table-nowrap align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="text-muted" style={{ width: 52 }}>#</th>
                          <th className="text-muted">Username</th>
                          <th className="text-muted">Email</th>
                          <th className="text-muted">Phone</th>
                          <th className="text-muted">Wallet</th>
                          <th className="text-muted">Points</th>
                          <th className="text-muted">Role</th>
                          <th className="text-muted">Status</th>
                          <th className="text-muted text-center" style={{ width: 120 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={9} className="text-center py-5">
                              <Spinner color="primary" />
                            </td>
                          </tr>
                        ) : users.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-5 text-muted">
                              <i className="ri-user-search-line fs-2 d-block mb-2 opacity-50"></i>
                              No users found
                            </td>
                          </tr>
                        ) : users.map((user, idx) => (
                          <tr key={user.id}>
                            <td className="text-muted fw-medium fs-13">{page * PAGE_SIZE + idx + 1}</td>

                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div className="avatar-xs flex-shrink-0">
                                  <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-13 fw-semibold">
                                    {user.username?.charAt(0).toUpperCase() || "?"}
                                  </div>
                                </div>
                                <span className="fw-medium">{user.username}</span>
                              </div>
                            </td>

                            <td className="text-muted">{user.email}</td>
                            <td className="text-muted">{user.phone || "—"}</td>
                            <td className="fw-semibold text-success">RM {fmtWallet(user.wallet)}</td>

                            <td>
                              <span className="badge bg-warning-subtle text-warning fs-12">
                                <i className="ri-star-fill me-1"></i>{user.points ?? 0}
                              </span>
                            </td>

                            <td><RoleBadge role={user.role} /></td>
                            <td><StatusBadge status={user.status} /></td>

                            <td>
                              <div className="d-flex gap-1 justify-content-center">
                                <button className="btn btn-sm btn-soft-info"    title="View"       onClick={() => openView(user)}><i className="ri-eye-line"></i></button>
                                <button className="btn btn-sm btn-soft-primary" title="Edit"       onClick={() => openEdit(user)}><i className="ri-edit-line"></i></button>
                                <button className="btn btn-sm btn-soft-danger"  title="Deactivate" onClick={() => openDeactivate(user)}><i className="ri-forbid-line"></i></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 0 && (
                    <Row className="align-items-center mt-3 g-3">
                      <div className="col-sm">
                        <p className="text-muted mb-0">
                          Showing <span className="fw-semibold">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)}</span>{" "}
                          of <span className="fw-semibold">{totalElements}</span> users
                        </p>
                      </div>
                      <div className="col-sm-auto">
                        <ul className="pagination pagination-separated pagination-md justify-content-center justify-content-sm-end mb-0">
                          <li className={page === 0 ? "page-item disabled" : "page-item"}>
                            <button className="page-link" onClick={() => setPage(p => p - 1)}><i className="ri-arrow-left-s-line"></i></button>
                          </li>
                          {pageNumbers().map((i) => (
                            <li key={i} className={page === i ? "page-item active" : "page-item"}>
                              <button className="page-link" onClick={() => setPage(i)}>{i + 1}</button>
                            </li>
                          ))}
                          <li className={page >= totalPages - 1 ? "page-item disabled" : "page-item"}>
                            <button className="page-link" onClick={() => setPage(p => p + 1)}><i className="ri-arrow-right-s-line"></i></button>
                          </li>
                        </ul>
                      </div>
                    </Row>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={viewOpen} toggle={closeView} centered size="lg" scrollable>
        <ModalHeader toggle={closeView} className="border-bottom-dashed">
          <i className="ri-account-circle-line me-2 text-primary align-middle"></i>
          User Details
        </ModalHeader>

        <ModalBody className="p-0">
          {viewUser && (
            <>
              {/* ── Section 1: User Info ─────────────────────────────────── */}
              <div className="p-4 border-bottom">
                <Row className="align-items-center">
                  {/* Avatar + name */}
                  <Col xs="auto">
                    <div className="avatar-lg">
                      <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-24 fw-bold">
                        {viewUser.username?.charAt(0).toUpperCase() || "?"}
                      </div>
                    </div>
                  </Col>
                  <Col>
                    <h5 className="mb-1 fw-semibold">{viewUser.username}</h5>
                    <div className="d-flex gap-2 flex-wrap">
                      <RoleBadge role={viewUser.role} />
                      <StatusBadge status={viewUser.status} />
                    </div>
                  </Col>
                </Row>

                <Row className="mt-3 g-2">
                  {[
                    { icon: "ri-mail-line",  color: "info",    label: "Email", value: viewUser.email },
                    { icon: "ri-phone-line", color: "success", label: "Phone", value: viewUser.phone || "—" },
                  ].map((r) => (
                    <Col sm={6} key={r.label}>
                      <div className="d-flex align-items-center gap-2 p-2 bg-light rounded">
                        <div className="avatar-xs flex-shrink-0">
                          <div className={`avatar-title bg-${r.color}-subtle text-${r.color} rounded-circle fs-14`}>
                            <i className={r.icon}></i>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-muted mb-0 fs-11 text-uppercase fw-medium">{r.label}</p>
                          <p className="fw-semibold mb-0 text-truncate fs-13">{r.value}</p>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>

              {/* ── Section 2: Wallet & Points ───────────────────────────── */}
              <div className="p-4 border-bottom">
                <p className="text-muted fs-11 text-uppercase fw-medium mb-3">
                  <i className="ri-wallet-3-line me-1"></i>Wallet & Points
                </p>
                <Row className="g-3">
                  <Col sm={6}>
                    <div className="border rounded p-3 bg-light h-100">
                      <p className="text-muted fs-12 text-uppercase fw-medium mb-2">Wallet Balance</p>
                      <h2 className="fw-bold text-success mb-0">
                        RM <span>{fmtWallet(viewUser.wallet)}</span>
                      </h2>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="border rounded p-3 bg-light h-100">
                      <p className="text-muted fs-12 text-uppercase fw-medium mb-2">Points</p>
                      <h2 className="fw-bold text-warning mb-0">
                        <i className="ri-star-fill fs-20 me-1 align-middle"></i>
                        {viewUser.points ?? 0}
                      </h2>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* ── Section 3: Referral ──────────────────────────────────── */}
              <div className="p-4 border-bottom">
                <p className="text-muted fs-11 text-uppercase fw-medium mb-3">
                  <i className="ri-gift-line me-1"></i>Referral Info
                </p>
                <Row className="g-3 align-items-center">
                  <Col sm={7}>
                    {/* Referral code */}
                    <div className="mb-3">
                      <p className="text-muted fs-11 text-uppercase fw-medium mb-1">Referral Code</p>
                      <span className="badge bg-primary-subtle text-primary fs-13 px-3 py-2 rounded-pill">
                        {viewUser.referralCode || "—"}
                      </span>
                    </div>
                    {/* Invite link */}
                    {viewUser.referralCode && (
                      <div>
                        <p className="text-muted fs-11 text-uppercase fw-medium mb-1">Invite Link</p>
                        <div className="input-group input-group-sm">
                          <input
                            type="text"
                            className="form-control text-muted fs-12"
                            value={buildReferralLink(viewUser.referralCode) || ""}
                            readOnly
                          />
                          <Button
                            color={copiedLink ? "success" : "primary"}
                            size="sm"
                            onClick={() => handleCopyLink(viewUser.referralCode)}
                          >
                            {copiedLink
                              ? <><i className="ri-check-line me-1"></i>Copied</>
                              : <><i className="ri-file-copy-line me-1"></i>Copy</>}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Col>
                  <Col sm={5} className="text-center">
                    <p className="text-muted fs-11 text-uppercase fw-medium mb-2">QR Code</p>
                    {buildReferralLink(viewUser.referralCode) ? (
                      <div className="d-inline-block border rounded p-2 bg-white shadow-sm">
                        <QRCodeSVG
                          value={buildReferralLink(viewUser.referralCode)!}
                          size={130}
                          bgColor="#ffffff"
                          fgColor="#000000"
                          level="M"
                        />
                      </div>
                    ) : (
                      <div className="text-muted py-2">
                        <i className="ri-qr-code-line fs-2 d-block mb-1 opacity-50"></i>
                        <span className="fs-12">No referral code</span>
                      </div>
                    )}
                  </Col>
                </Row>
              </div>

              {/* ── Section 4: Wallet Transaction Logs ──────────────────── */}
              <div className="p-4">
                <p className="text-muted fs-11 text-uppercase fw-medium mb-3">
                  <i className="ri-exchange-funds-line me-1"></i>Wallet Transaction Logs
                </p>
                {logsLoading ? (
                  <div className="text-center py-4"><Spinner color="primary" size="sm" /></div>
                ) : walletLogs.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="ri-inbox-line fs-2 d-block mb-1 opacity-50"></i>
                    <span className="fs-13">No transactions found</span>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table-sm table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="text-muted fs-12">Date</th>
                          <th className="text-muted fs-12">Amount</th>
                          <th className="text-muted fs-12">Type</th>
                          <th className="text-muted fs-12">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walletLogs.map((tx, i) => (
                          <tr key={tx.id ?? i}>
                            <td className="text-muted fs-13">{fmtDate(tx.createTime)}</td>
                            <td>
                              <span className={`fw-semibold fs-13 ${tx.amount >= 0 ? "text-success" : "text-danger"}`}>
                                {tx.amount >= 0 ? "+" : ""}RM {Math.abs(tx.amount).toFixed(2)}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-info-subtle text-info fs-11">
                                {tx.type}
                              </span>
                            </td>
                            <td className="text-muted fs-13">{tx.description || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </ModalBody>

        <ModalFooter className="border-top-dashed">
          <Button color="light" onClick={closeView}>Close</Button>
          <Button color="primary" outline onClick={() => { closeView(); if (viewUser) openEdit(viewUser); }}>
            <i className="ri-edit-line me-1"></i>Edit
          </Button>
        </ModalFooter>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          EDIT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={editOpen} toggle={() => !editLoading && setEditOpen(false)} centered>
        <ModalHeader toggle={() => !editLoading && setEditOpen(false)} className="border-bottom-dashed">
          <i className="ri-edit-line me-2 text-primary align-middle"></i>Edit User
        </ModalHeader>
        <Form onSubmit={(e) => { e.preventDefault(); editFormik.handleSubmit(); }}>
          <ModalBody className="p-4">
            {editUser && (
              <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded">
                <div className="avatar-sm flex-shrink-0">
                  <div className="avatar-title bg-primary-subtle text-primary rounded-circle fw-bold fs-16">
                    {editUser.username?.charAt(0).toUpperCase() || "?"}
                  </div>
                </div>
                <div>
                  <p className="fw-semibold mb-0">{editUser.username}</p>
                  <p className="text-muted mb-0 fs-12">ID #{editUser.id}</p>
                </div>
              </div>
            )}

            <div className="mb-3">
              <Label htmlFor="edit-username" className="form-label">Username <span className="text-danger">*</span></Label>
              <Input id="edit-username" name="username" type="text" placeholder="Enter username"
                onChange={editFormik.handleChange} onBlur={editFormik.handleBlur}
                value={editFormik.values.username}
                invalid={editFormik.touched.username && !!editFormik.errors.username} />
              {editFormik.touched.username && editFormik.errors.username && (
                <FormFeedback>{editFormik.errors.username}</FormFeedback>
              )}
            </div>

            <div className="mb-3">
              <Label htmlFor="edit-email" className="form-label">Email <span className="text-danger">*</span></Label>
              <Input id="edit-email" name="email" type="email" placeholder="Enter email"
                onChange={editFormik.handleChange} onBlur={editFormik.handleBlur}
                value={editFormik.values.email}
                invalid={editFormik.touched.email && !!editFormik.errors.email} />
              {editFormik.touched.email && editFormik.errors.email && (
                <FormFeedback>{editFormik.errors.email}</FormFeedback>
              )}
            </div>

            <div className="mb-1">
              <Label htmlFor="edit-phone" className="form-label">Phone</Label>
              <Input id="edit-phone" name="phone" type="tel" placeholder="Enter phone number"
                onChange={editFormik.handleChange} onBlur={editFormik.handleBlur}
                value={editFormik.values.phone} />
            </div>
          </ModalBody>
          <ModalFooter className="border-top-dashed">
            <Button color="light" type="button" onClick={() => setEditOpen(false)} disabled={editLoading}>Cancel</Button>
            <Button color="primary" type="submit" disabled={editLoading}>
              {editLoading && <Spinner size="sm" className="me-1" />}Save Changes
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          DEACTIVATE CONFIRMATION MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={deactivateOpen} toggle={() => !deactivateLoading && setDeactivateOpen(false)} centered size="sm">
        <ModalBody className="text-center p-4">
          <div className="avatar-lg mx-auto mb-3">
            <div className="avatar-title bg-danger-subtle text-danger rounded-circle fs-28">
              <i className="ri-forbid-line"></i>
            </div>
          </div>
          <h5 className="mb-1 fw-semibold">Deactivate User?</h5>
          <p className="text-muted mb-4">
            Are you sure you want to deactivate <strong className="text-body">{deactivateUser?.username}</strong>?
            <br /><span className="fs-12">Their account will be disabled.</span>
          </p>
          <div className="d-flex gap-2 justify-content-center">
            <Button color="light" onClick={() => setDeactivateOpen(false)} disabled={deactivateLoading}>Cancel</Button>
            <Button color="danger" onClick={confirmDeactivate} disabled={deactivateLoading}>
              {deactivateLoading && <Spinner size="sm" className="me-1" />}
              <i className="ri-forbid-line me-1"></i>Deactivate
            </Button>
          </div>
        </ModalBody>
      </Modal>

    </React.Fragment>
  );
};

export default AdminUsers;
