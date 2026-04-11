import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, Row, Col, Card, CardBody, CardHeader,
  Table, Modal, ModalHeader, ModalBody, ModalFooter,
  Button, Input, InputGroup, Label, Spinner,
} from "reactstrap";
import {
  getAdminRequests, shipRequest, getProductById,
  AdminRequest, AdminRequestFilters, ProductImage,
} from "../../helpers/productApi";
import { getWalletLogs, WalletTransaction } from "../../helpers/adminApi";
import { approvePayment, rejectPayment } from "../../helpers/paymentApi";
import { showToast } from "../../helpers/appToast";

const PAGE_SIZE = 10;

const fmtDate = (d: string | undefined) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-MY", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return d; }
};

// ── Shared UI atoms ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toUpperCase();
  if (s === "PENDING")   return <span className="badge bg-warning-subtle text-warning">Pending</span>;
  if (s === "SHIPPED")   return <span className="badge bg-info-subtle text-info">Shipped</span>;
  if (s === "COMPLETED") return <span className="badge bg-success-subtle text-success">Completed</span>;
  if (s === "RECEIVED")  return <span className="badge bg-success-subtle text-success">Received</span>;
  if (s === "CANCELLED") return <span className="badge bg-danger-subtle text-danger">Cancelled</span>;
  return <span className="badge bg-secondary-subtle text-secondary">{status || "—"}</span>;
};

const PaymentStatusBadge = ({ status }: { status?: string }) => {
  if (!status) return null;
  const s = status.toUpperCase();
  if (s === "PAID")     return <span className="badge bg-success-subtle text-success">Paid</span>;
  if (s === "REJECTED") return <span className="badge bg-danger-subtle text-danger">Rejected</span>;
  if (s === "PENDING")  return <span className="badge bg-warning-subtle text-warning">Awaiting Verification</span>;
  return <span className="badge bg-secondary-subtle text-secondary">{status}</span>;
};

const SectionCard: React.FC<{
  icon: string; title: string; color?: string; children: React.ReactNode;
}> = ({ icon, title, color = "primary", children }) => (
  <Card className="border shadow-none mb-0" style={{ borderRadius: 10 }}>
    <CardHeader className="py-2 px-3"
      style={{ background: "var(--vz-secondary-bg)", borderRadius: "10px 10px 0 0" }}>
      <h6 className="mb-0 fw-semibold fs-13">
        <i className={`${icon} me-2 text-${color}`}></i>{title}
      </h6>
    </CardHeader>
    <CardBody className="p-3">{children}</CardBody>
  </Card>
);

const InfoRow: React.FC<{ label: string; value: React.ReactNode; last?: boolean }> = ({
  label, value, last,
}) => (
  <div className="d-flex justify-content-between align-items-start py-2"
    style={last ? undefined : { borderBottom: "1px solid var(--vz-border-color)" }}>
    <span className="text-muted fs-12 fw-medium flex-shrink-0" style={{ minWidth: 130 }}>{label}</span>
    <span className="fs-13 text-end">{value ?? "—"}</span>
  </div>
);

// ── Product Image Viewer ──────────────────────────────────────────────────────

const ProductImageViewer: React.FC<{
  images?: ProductImage[];
  productId?: number;
}> = ({ images, productId }) => {
  const [sel,           setSel]           = useState(0);
  const [fetchedImages, setFetchedImages] = useState<ProductImage[]>([]);
  const [fetching,      setFetching]      = useState(false);

  const display = (images && images.length > 0) ? images : fetchedImages;

  // Reset selection when the displayed set changes
  useEffect(() => { setSel(0); }, [display.length]);

  // Auto-fetch product images when none are provided
  useEffect(() => {
    if ((images && images.length > 0) || !productId) return;
    setFetching(true);
    setFetchedImages([]);
    getProductById(productId)
      .then((res) => {
        if (res.code === 200 && res.data?.images?.length) {
          setFetchedImages(res.data.images);
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [images, productId]);

  if (fetching) {
    return (
      <div className="d-flex align-items-center justify-content-center rounded-3 mb-3"
        style={{ height: 150, background: "var(--vz-secondary-bg)", border: "1px solid var(--vz-border-color)" }}>
        <Spinner size="sm" color="secondary" />
      </div>
    );
  }

  if (!display.length) {
    return (
      <div className="d-flex align-items-center justify-content-center rounded-3 mb-3"
        style={{ height: 150, background: "var(--vz-secondary-bg)", border: "1px solid var(--vz-border-color)" }}>
        <i className="ri-image-line text-muted" style={{ fontSize: 40, opacity: 0.3 }}></i>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="rounded-3 overflow-hidden d-flex align-items-center justify-content-center mb-2"
        style={{ height: 150, background: "#f8f9fa", border: "1px solid var(--vz-border-color)" }}>
        <img src={display[sel].imageUrl} alt="product"
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
      </div>
      {display.length > 1 && (
        <div className="d-flex gap-2 flex-wrap">
          {display.map((img, i) => (
            <div key={img.id} role="button" onClick={() => setSel(i)}
              className="rounded-2 overflow-hidden flex-shrink-0 d-flex align-items-center justify-content-center"
              style={{
                width: 44, height: 44, background: "#f8f9fa", cursor: "pointer",
                border: `2px solid ${i === sel ? "var(--vz-primary)" : "var(--vz-border-color)"}`,
              }}>
              <img src={img.imageUrl} alt=""
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Status tab bar ────────────────────────────────────────────────────────────

const STATUS_TABS: { label: string; value: string; icon: string }[] = [
  { label: "All",       value: "",          icon: "ri-list-unordered" },
  { label: "Pending",   value: "PENDING",   icon: "ri-time-line" },
  { label: "Shipped",   value: "SHIPPED",   icon: "ri-truck-line" },
  { label: "Completed", value: "COMPLETED", icon: "ri-checkbox-circle-line" },
];

// ── Receipt View Modal ────────────────────────────────────────────────────────

const ReceiptModal: React.FC<{
  open: boolean; url: string; onClose: () => void;
}> = ({ open, url, onClose }) => (
  <Modal isOpen={open} toggle={onClose} centered size="lg" scrollable>
    <ModalHeader toggle={onClose} className="border-bottom-dashed">
      <i className="ri-image-line me-2 text-primary align-middle"></i>
      Payment Receipt
    </ModalHeader>
    <ModalBody className="text-center p-4">
      <img src={url} alt="Payment receipt"
        style={{ maxWidth: "100%", maxHeight: 600, objectFit: "contain", borderRadius: 8, border: "1px solid var(--vz-border-color)" }}
        onError={(e) => { (e.target as HTMLImageElement).alt = "Image could not be loaded"; }}
      />
    </ModalBody>
    <ModalFooter className="border-top-dashed">
      <a href={url} target="_blank" rel="noreferrer" download className="btn btn-primary rounded-3">
        <i className="ri-download-line me-1"></i>Download
      </a>
      <Button color="light" onClick={onClose} className="rounded-3">Close</Button>
    </ModalFooter>
  </Modal>
);

// ── Wallet History Modal ──────────────────────────────────────────────────────

const WALLET_PAGE_SIZE = 10;

const WalletHistoryModal: React.FC<{
  open: boolean; userId: number; username?: string; onClose: () => void;
}> = ({ open, userId, username, onClose }) => {
  const [logs,           setLogs]           = useState<WalletTransaction[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [wPage,          setWPage]          = useState(0);
  const [wTotalPages,    setWTotalPages]    = useState(0);
  const [wTotalElements, setWTotalElements] = useState(0);
  const [startInput,     setStartInput]     = useState("");
  const [endInput,       setEndInput]       = useState("");
  const [appliedStart,   setAppliedStart]   = useState("");
  const [appliedEnd,     setAppliedEnd]     = useState("");

  const fetchLogs = useCallback(async (p: number, start: string, end: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await getWalletLogs(userId, {
        page: p, size: WALLET_PAGE_SIZE,
        startDate: start || undefined,
        endDate:   end   || undefined,
      });
      if (res.code === 200 && res.data) {
        const d = res.data as any;
        if (Array.isArray(d)) {
          setLogs(d);
          setWTotalPages(1);
          setWTotalElements(d.length);
        } else {
          setLogs(d.content ?? []);
          setWTotalPages(d.totalPages ?? 1);
          setWTotalElements(d.totalElements ?? 0);
        }
      } else {
        setLogs([]);
        showToast.error((res as any).msg || "Failed to load wallet history");
      }
    } catch {
      showToast.error("Network error");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Reset + fetch on open / user change
  useEffect(() => {
    if (!open) return;
    setWPage(0);
    setStartInput("");
    setEndInput("");
    setAppliedStart("");
    setAppliedEnd("");
    fetchLogs(0, "", "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  const handleSearch = () => {
    setWPage(0);
    setAppliedStart(startInput);
    setAppliedEnd(endInput);
    fetchLogs(0, startInput, endInput);
  };

  const handleReset = () => {
    setStartInput("");
    setEndInput("");
    setAppliedStart("");
    setAppliedEnd("");
    setWPage(0);
    fetchLogs(0, "", "");
  };

  const handlePageChange = (p: number) => {
    setWPage(p);
    fetchLogs(p, appliedStart, appliedEnd);
  };

  const wPageNums = () => {
    if (wTotalPages <= 7) return Array.from({ length: wTotalPages }, (_, i) => i);
    const s = Math.max(0, Math.min(wPage - 2, wTotalPages - 5));
    return Array.from({ length: Math.min(5, wTotalPages) }, (_, i) => s + i);
  };

  return (
    <Modal isOpen={open} toggle={onClose} centered size="lg" scrollable>
      <ModalHeader toggle={onClose} className="border-bottom-dashed">
        <i className="ri-wallet-3-line me-2 text-info align-middle"></i>
        Wallet History
        {username && <span className="text-muted fw-normal ms-2 fs-14">— {username}</span>}
      </ModalHeader>

      <ModalBody className="p-0">
        <div className="p-4">
          {/* Date filter */}
          <Row className="g-2 mb-3 align-items-end">
            <Col xs={12} sm={4}>
              <label className="form-label text-muted fs-11 text-uppercase fw-medium mb-1">Start Date</label>
              <input type="date" className="form-control form-control-sm"
                value={startInput} max={endInput || undefined}
                onChange={(e) => setStartInput(e.target.value)} />
            </Col>
            <Col xs={12} sm={4}>
              <label className="form-label text-muted fs-11 text-uppercase fw-medium mb-1">End Date</label>
              <input type="date" className="form-control form-control-sm"
                value={endInput} min={startInput || undefined}
                onChange={(e) => setEndInput(e.target.value)} />
            </Col>
            <Col xs="auto">
              <Button color="primary" size="sm" onClick={handleSearch} disabled={loading}>
                <i className="ri-search-line me-1"></i>Search
              </Button>
            </Col>
            <Col xs="auto">
              <Button color="light" size="sm" onClick={handleReset} disabled={loading}>
                <i className="ri-refresh-line me-1"></i>Reset
              </Button>
            </Col>
          </Row>

          {/* Content */}
          {loading ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
              <p className="text-muted mt-2 mb-0 fs-14">Loading transactions…</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ri-wallet-3-line d-block mb-2 opacity-25" style={{ fontSize: 48 }}></i>
              <p className="fs-14 mb-0">No wallet transactions found.</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table className="table-hover table-sm align-middle mb-0 fs-13">
                  <thead className="table-light">
                    <tr>
                      <th className="text-muted" style={{ width: 40 }}>#</th>
                      <th className="text-muted">Date</th>
                      <th className="text-muted text-end">Amount</th>
                      <th className="text-muted">Type</th>
                      <th className="text-muted">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => {
                      const positive = Number(log.amount) >= 0;
                      return (
                        <tr key={log.id ?? i}>
                          <td className="text-muted">{wPage * WALLET_PAGE_SIZE + i + 1}</td>
                          <td className="text-muted">{fmtDate(log.createTime)}</td>
                          <td className="text-end fw-semibold">
                            <span className={positive ? "text-success" : "text-danger"}>
                              {positive ? "+" : ""}RM {Math.abs(Number(log.amount)).toFixed(2)}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-info-subtle text-info" style={{ fontSize: 10.5 }}>
                              {log.type}
                            </span>
                          </td>
                          <td className="text-muted">{log.description ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

              {/* Pagination */}
              {wTotalPages > 1 && (
                <Row className="align-items-center mt-3 g-3">
                  <div className="col-sm">
                    <p className="text-muted mb-0 fs-12">
                      Showing{" "}
                      <span className="fw-semibold">
                        {wPage * WALLET_PAGE_SIZE + 1}–{Math.min((wPage + 1) * WALLET_PAGE_SIZE, wTotalElements)}
                      </span>{" "}
                      of <span className="fw-semibold">{wTotalElements}</span>
                    </p>
                  </div>
                  <div className="col-sm-auto">
                    <ul className="pagination pagination-separated pagination-sm justify-content-center justify-content-sm-end mb-0">
                      <li className={wPage === 0 ? "page-item disabled" : "page-item"}>
                        <button className="page-link" onClick={() => handlePageChange(wPage - 1)}>
                          <i className="ri-arrow-left-s-line"></i>
                        </button>
                      </li>
                      {wPageNums().map((i) => (
                        <li key={i} className={wPage === i ? "page-item active" : "page-item"}>
                          <button className="page-link" onClick={() => handlePageChange(i)}>{i + 1}</button>
                        </li>
                      ))}
                      <li className={wPage >= wTotalPages - 1 ? "page-item disabled" : "page-item"}>
                        <button className="page-link" onClick={() => handlePageChange(wPage + 1)}>
                          <i className="ri-arrow-right-s-line"></i>
                        </button>
                      </li>
                    </ul>
                  </div>
                </Row>
              )}
            </>
          )}
        </div>
      </ModalBody>

      <ModalFooter className="border-top-dashed">
        {wTotalElements > 0 && (
          <p className="text-muted fs-12 mb-0 me-auto">
            {wTotalElements} transaction{wTotalElements !== 1 ? "s" : ""}
          </p>
        )}
        <Button color="light" onClick={onClose} className="rounded-3">Close</Button>
      </ModalFooter>
    </Modal>
  );
};

// ── Ship Modal ────────────────────────────────────────────────────────────────

const ShipModal: React.FC<{
  req: AdminRequest | null; open: boolean;
  onClose: () => void; onShipped: (trackingNumber: string) => void;
}> = ({ req, open, onClose, onShipped }) => {
  const [tracking, setTracking] = useState("");
  const [error,    setError]    = useState(false);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => { if (!open) { setTracking(""); setError(false); } }, [open]);

  const handleShip = async () => {
    if (!tracking.trim()) { setError(true); return; }
    if (!req) return;
    setLoading(true);
    try {
      const res = await shipRequest(req.id, tracking.trim());
      if (res.code === 200) {
        showToast.success("Order shipped successfully!");
        onShipped(tracking.trim());
        onClose();
      } else {
        showToast.error(res.msg || "Failed to ship order");
      }
    } catch {
      showToast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!req) return null;

  return (
    <Modal isOpen={open} toggle={() => !loading && onClose()} centered>
      <ModalHeader toggle={() => !loading && onClose()} className="border-bottom-dashed">
        <i className="ri-truck-line me-2 text-primary align-middle"></i>Ship Order
      </ModalHeader>

      <ModalBody className="p-4">
        {/* Summary strip */}
        <div className="d-flex gap-3 p-3 rounded-3 mb-4 flex-wrap"
          style={{ background: "var(--vz-secondary-bg)", border: "1px solid var(--vz-border-color)" }}>
          <div>
            <p className="text-muted fs-11 text-uppercase fw-medium mb-0">Request</p>
            <p className="fw-semibold mb-0">#{req.id}</p>
          </div>
          <div className="vr d-none d-sm-block"></div>
          <div>
            <p className="text-muted fs-11 text-uppercase fw-medium mb-0">Customer</p>
            <p className="fw-semibold mb-0">
              {req.username ?? `#${req.userId}`}
              {req.email && <span className="text-muted ms-1 fw-normal fs-12">{req.email}</span>}
            </p>
          </div>
          <div className="vr d-none d-sm-block"></div>
          <div>
            <p className="text-muted fs-11 text-uppercase fw-medium mb-0">Amount</p>
            <p className="fw-semibold mb-0">
              {req.redeemType === "POINT"
                ? <span className="text-warning"><i className="ri-star-fill me-1 fs-11"></i>{Number(req.amountPoints ?? 0)} pts</span>
                : <span className="text-success">RM {Number(req.amountWallet ?? 0).toFixed(2)}</span>
              }
            </p>
          </div>
        </div>

        {/* Tracking input */}
        <div>
          <Label className="form-label fw-medium">
            Tracking Number <span className="text-danger">*</span>
          </Label>
          <Input type="text" placeholder="e.g. JT1234567890MY"
            value={tracking}
            onChange={(e) => { setTracking(e.target.value); setError(false); }}
            invalid={error} className="font-monospace" />
          {error && <div className="invalid-feedback d-block">Tracking number is required</div>}
        </div>
      </ModalBody>

      <ModalFooter className="border-top-dashed">
        <Button color="light" onClick={onClose} disabled={loading} className="rounded-3">Cancel</Button>
        <Button color="primary" onClick={handleShip} disabled={loading} className="rounded-3">
          {loading ? <><Spinner size="sm" className="me-1" />Shipping…</> : <><i className="ri-truck-line me-1"></i>Confirm Ship</>}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// ── Request Detail Modal ──────────────────────────────────────────────────────

const DetailModal: React.FC<{
  req: AdminRequest | null; open: boolean;
  onClose: () => void; onShipClick: () => void; onWalletClick: () => void;
  onApprovePayment: () => void; onRejectPayment: () => void;
  approvingPayment: boolean; rejectingPayment: boolean;
  onViewReceipt: (url: string) => void;
}> = ({ req, open, onClose, onShipClick, onWalletClick, onApprovePayment, onRejectPayment, approvingPayment, rejectingPayment, onViewReceipt }) => {
  if (!req) return null;

  const status        = req.status?.toUpperCase();
  const paymentStatus = req.paymentStatus?.toUpperCase();
  const isBank        = req.redeemType === "BANK_TRANSFER";
  const isWallet      = req.redeemType === "WALLET";

  const addrName  = req.receiverName ?? "";
  const addrPhone = req.phone        ?? "";
  const addrLine1 = req.addressLine1 ?? "";
  const addrLine2 = req.addressLine2 ?? "";
  const addrCity  = req.city         ?? "";
  const addrState = req.state        ?? "";
  const addrPost  = req.postcode     ?? "";
  const addrCtry  = req.country      ?? "";
  const hasAddress = addrName || addrLine1 || addrCity;

  return (
    <>
      <Modal isOpen={open} toggle={onClose} centered size="xl" scrollable>
        <ModalHeader toggle={onClose} className="border-bottom-dashed">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="fs-15 fw-semibold">
              Request <span className="text-primary">#{req.id}</span>
            </span>
            <StatusBadge status={req.status} />
            {req.paymentStatus && <PaymentStatusBadge status={req.paymentStatus} />}
          </div>
        </ModalHeader>

        <ModalBody style={{ background: "var(--vz-body-bg)" }}>
          <Row className="g-3">

            {/* ── Left column ───────────────────────────────────────────── */}
            <Col lg={6} className="d-flex flex-column gap-3">

              {/* Request Information */}
              <SectionCard icon="ri-file-list-3-line" title="Request Information">
                <InfoRow label="Request ID"   value={<span className="fw-semibold">#{req.id}</span>} />
                <InfoRow label="Status"       value={<StatusBadge status={req.status} />} />
                {req.paymentStatus && (
                  <InfoRow label="Payment Status" value={<PaymentStatusBadge status={req.paymentStatus} />} />
                )}
                <InfoRow label="Redeem Type"  value={
                  isWallet ? <span className="badge bg-success-subtle text-success"><i className="ri-wallet-3-line me-1"></i>Wallet</span>
                  : isBank  ? <span className="badge bg-primary-subtle text-primary"><i className="ri-bank-line me-1"></i>Online Banking</span>
                  : <span className="badge bg-warning-subtle text-warning"><i className="ri-star-fill me-1"></i>Points</span>
                } />
                <InfoRow label="Created"      value={<span className="text-muted fs-12">{fmtDate(req.createTime)}</span>} />
                <InfoRow label="Tracking No." last value={
                  req.trackingNumber
                    ? <span className="fw-medium font-monospace text-primary">{req.trackingNumber}</span>
                    : <span className="text-muted">—</span>
                } />
              </SectionCard>

              {/* Product Information */}
              <SectionCard icon="ri-box-3-line" title="Product Information" color="warning">
                <ProductImageViewer images={req.productImages} productId={req.productId} />
                <InfoRow label="Product" value={
                  <span className="fw-semibold">{req.productName ?? `Product #${req.productId}`}</span>
                } />
                <InfoRow label="Redeemed using" value={
                  isWallet ? <span className="fw-bold text-success">Wallet — RM {Number(req.amountWallet ?? 0).toFixed(2)}</span>
                  : isBank  ? <span className="fw-bold text-primary">Bank Transfer — RM {Number(req.amountWallet ?? 0).toFixed(2)}</span>
                  : <span className="fw-bold text-warning"><i className="ri-star-fill me-1 fs-11"></i>{req.amountPoints ?? 0} pts</span>
                } last={!req.receiptUrl} />
                {req.receiptUrl && (
                  <div className="pt-2">
                    <p className="text-muted fs-11 text-uppercase fw-semibold mb-2">Payment Receipt</p>
                    <Button color="primary" outline size="sm" className="rounded-3"
                      onClick={() => onViewReceipt(req.receiptUrl!)}>
                      <i className="ri-image-line me-1"></i>View Receipt
                    </Button>
                  </div>
                )}
              </SectionCard>
            </Col>

            {/* ── Right column ──────────────────────────────────────────── */}
            <Col lg={6} className="d-flex flex-column gap-3">

              {/* Customer Information */}
              <SectionCard icon="ri-user-3-line" title="Customer Information" color="info">
                <InfoRow label="Username" value={req.username || "—"} />
                <InfoRow label="Email"    value={
                  req.email
                    ? <a href={`mailto:${req.email}`} className="text-primary fs-13">{req.email}</a>
                    : "—"
                } />
                <InfoRow label="User ID"  last value={<span className="fw-semibold text-muted">#{req.userId}</span>} />
              </SectionCard>

              {/* Delivery Address */}
              <SectionCard icon="ri-map-pin-2-line" title="Delivery Address" color="danger">
                {hasAddress ? (
                  <div className="rounded-3 p-3"
                    style={{ background: "var(--vz-secondary-bg)", border: "1px solid var(--vz-border-color)" }}>
                    {addrName  && <p className="fw-semibold mb-1 fs-13">{addrName}</p>}
                    {addrPhone && <p className="text-muted mb-1 fs-12"><i className="ri-phone-line me-1"></i>{addrPhone}</p>}
                    {addrLine1 && <p className="text-muted mb-0 fs-12">{addrLine1}</p>}
                    {addrLine2 && <p className="text-muted mb-0 fs-12">{addrLine2}</p>}
                    {(addrCity || addrState || addrPost) && (
                      <p className="text-muted mb-0 fs-12">
                        {[addrCity, addrState].filter(Boolean).join(", ")}
                        {addrPost ? ` ${addrPost}` : ""}
                      </p>
                    )}
                    {addrCtry && <p className="text-muted mb-0 fs-12">{addrCtry}</p>}
                  </div>
                ) : (
                  <p className="text-muted fs-13 mb-0">No delivery address recorded.</p>
                )}
              </SectionCard>

              {/* Admin Action */}
              <SectionCard icon="ri-settings-3-line" title="Admin Action">

                {/* ── Order Flow Stepper (bank transfer only) ── */}
                {isBank && (() => {
                  type StepState = "done" | "active" | "idle";
                  const steps: { label: string; icon: string; state: StepState }[] = [
                    {
                      label: "Receipt Received",
                      icon: "ri-file-upload-line",
                      // Active when pending verification (paymentStatus is PENDING or null)
                      state: status === "PENDING" && paymentStatus !== "PAID" && paymentStatus !== "REJECTED" ? "active" : "done",
                    },
                    {
                      label: "Payment Verified",
                      icon: "ri-shield-check-line",
                      state: paymentStatus === "PAID" && status === "PENDING" ? "active"
                           : (paymentStatus === "PAID" && status !== "PENDING") ? "done"
                           : "idle",
                    },
                    {
                      label: "Shipped",
                      icon: "ri-truck-line",
                      state: status === "SHIPPED" ? "active"
                           : (status === "COMPLETED" || status === "RECEIVED") ? "done" : "idle",
                    },
                    {
                      label: "Completed",
                      icon: "ri-checkbox-circle-line",
                      state: (status === "COMPLETED" || status === "RECEIVED") ? "active" : "idle",
                    },
                  ];
                  // Steps before active are done, active is active, after are idle
                  let foundActive = false;
                  const finalSteps = steps.map((s) => {
                    if (foundActive) return { ...s, state: "idle" as StepState };
                    if (s.state === "active") { foundActive = true; return s; }
                    return { ...s, state: "done" as StepState };
                  });
                  // If rejected, override step 2 to rejected
                  const displaySteps = finalSteps.map((s, i) =>
                    i === 1 && paymentStatus === "REJECTED" ? { ...s, state: "idle" as StepState, label: "Payment Rejected", icon: "ri-close-circle-line" } : s
                  );
                  return (
                    <div className="d-flex align-items-center justify-content-between mb-3 px-1">
                      {displaySteps.map((step, i) => (
                        <React.Fragment key={i}>
                          <div className="d-flex flex-column align-items-center text-center" style={{ flex: 1, minWidth: 0 }}>
                            <div className="rounded-circle d-flex align-items-center justify-content-center mb-1 flex-shrink-0"
                              style={{
                                width: 34, height: 34,
                                background: step.state === "done" ? "var(--vz-success-bg-subtle)"
                                  : step.state === "active" ? (paymentStatus === "REJECTED" && i === 1 ? "var(--vz-danger-bg-subtle)" : "var(--vz-primary-bg-subtle)")
                                  : "var(--vz-secondary-bg)",
                                border: `2px solid ${
                                  step.state === "done" ? "var(--vz-success)"
                                  : step.state === "active" ? (paymentStatus === "REJECTED" && i === 1 ? "var(--vz-danger)" : "var(--vz-primary)")
                                  : "var(--vz-border-color)"}`,
                              }}>
                              <i className={`${step.icon} fs-15`} style={{
                                color: step.state === "done" ? "var(--vz-success)"
                                  : step.state === "active" ? (paymentStatus === "REJECTED" && i === 1 ? "var(--vz-danger)" : "var(--vz-primary)")
                                  : "var(--vz-secondary-color)",
                              }}></i>
                            </div>
                            <span className="fs-11 fw-medium text-truncate w-100" style={{
                              color: step.state === "done" ? "var(--vz-success)"
                                : step.state === "active" ? (paymentStatus === "REJECTED" && i === 1 ? "var(--vz-danger)" : "var(--vz-primary)")
                                : "var(--vz-secondary-color)",
                            }}>{step.label}</span>
                          </div>
                          {i < displaySteps.length - 1 && (
                            <div className="flex-shrink-0 mb-4" style={{
                              height: 2, width: 16,
                              background: finalSteps[i].state === "done" ? "var(--vz-success)" : "var(--vz-border-color)",
                            }} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  );
                })()}

                {/* ── BANK_TRANSFER: awaiting admin verification ── */}
                {isBank && paymentStatus !== "PAID" && paymentStatus !== "REJECTED" && status === "PENDING" && (
                  <div>
                    {/* Receipt preview — always show if URL exists */}
                    {req.receiptUrl ? (
                      <div className="rounded-3 mb-3 text-center"
                        style={{ background: "var(--vz-secondary-bg)", border: "1px solid var(--vz-border-color)", padding: 12 }}>
                        <p className="text-muted fs-11 text-uppercase fw-semibold mb-2">
                          <i className="ri-image-line me-1"></i>Customer Payment Receipt
                        </p>
                        <img src={req.receiptUrl} alt="receipt"
                          style={{ maxHeight: 180, maxWidth: "100%", objectFit: "contain", borderRadius: 6, cursor: "pointer" }}
                          onClick={() => onViewReceipt(req.receiptUrl!)}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <p className="text-muted fs-11 mt-1 mb-0">
                          <i className="ri-zoom-in-line me-1"></i>Click image to view full size
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-3 mb-3 text-center py-3"
                        style={{ background: "var(--vz-warning-bg-subtle)", border: "1px dashed var(--vz-warning)" }}>
                        <i className="ri-image-line text-warning d-block mb-1" style={{ fontSize: 28 }}></i>
                        <p className="text-warning fs-12 mb-0 fw-medium">Receipt not uploaded yet</p>
                        <p className="text-muted fs-11 mb-0">Waiting for customer to upload payment receipt.</p>
                      </div>
                    )}
                    <div className="d-flex gap-2">
                      <Button color="success" className="flex-grow-1 rounded-3 fw-medium"
                        disabled={approvingPayment || rejectingPayment || !req.receiptUrl}
                        onClick={onApprovePayment}>
                        {approvingPayment
                          ? <><Spinner size="sm" className="me-1" />Verifying…</>
                          : <><i className="ri-shield-check-line me-1"></i>Verify Payment</>}
                      </Button>
                      <Button color="danger" outline className="rounded-3 fw-medium"
                        style={{ minWidth: 95 }}
                        disabled={approvingPayment || rejectingPayment || !req.receiptUrl}
                        onClick={onRejectPayment}>
                        {rejectingPayment
                          ? <><Spinner size="sm" className="me-1" />…</>
                          : <><i className="ri-close-line me-1"></i>Reject</>}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── BANK_TRANSFER: payment verified, ready to ship ── */}
                {isBank && paymentStatus === "PAID" && status === "PENDING" && (
                  <div className="d-flex align-items-center justify-content-between gap-3 p-3 rounded-3"
                    style={{ background: "#e8f5e9", border: "1px solid #a5d6a7" }}>
                    <div className="d-flex align-items-center gap-2">
                      <i className="ri-shield-check-line fs-22" style={{ color: "#2e7d32" }}></i>
                      <div>
                        <p className="fw-semibold mb-0 fs-13" style={{ color: "#2e7d32" }}>Payment Verified</p>
                        <p className="text-muted fs-12 mb-0">Ready to ship this order.</p>
                      </div>
                    </div>
                    <Button color="primary" className="rounded-3 fw-medium flex-shrink-0" onClick={onShipClick}>
                      <i className="ri-truck-line me-1"></i>Ship Now
                    </Button>
                  </div>
                )}

                {/* ── BANK_TRANSFER: payment rejected ── */}
                {isBank && paymentStatus === "REJECTED" && (
                  <div className="d-flex align-items-center gap-3 p-3 rounded-3"
                    style={{ background: "var(--vz-danger-bg-subtle)", border: "1px solid var(--vz-danger-border-subtle)" }}>
                    <i className="ri-close-circle-line text-danger fs-22"></i>
                    <div>
                      <p className="fw-semibold text-danger mb-0 fs-13">Payment Rejected</p>
                      <p className="text-muted fs-12 mb-0">Receipt was rejected. Stock has been restored.</p>
                    </div>
                  </div>
                )}

                {/* ── POINT / WALLET: ship immediately ── */}
                {!isBank && status === "PENDING" && (
                  <div className="d-flex align-items-center justify-content-between gap-3 p-3 rounded-3"
                    style={{ background: "var(--vz-primary-bg-subtle)", border: "1px solid var(--vz-primary-border-subtle)" }}>
                    <div className="d-flex align-items-center gap-2">
                      <i className="ri-box-3-line text-primary fs-22"></i>
                      <div>
                        <p className="fw-semibold text-primary mb-0 fs-13">Ready to Ship</p>
                        <p className="text-muted fs-12 mb-0">Payment confirmed. Pack and dispatch.</p>
                      </div>
                    </div>
                    <Button color="primary" className="rounded-3 fw-medium flex-shrink-0" onClick={onShipClick}>
                      <i className="ri-truck-line me-1"></i>Ship Now
                    </Button>
                  </div>
                )}

                {/* ── Shipped ── */}
                {status === "SHIPPED" && (
                  <div className="p-3 rounded-3"
                    style={{ background: "var(--vz-info-bg-subtle)", border: "1px solid var(--vz-info-border-subtle)" }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <i className="ri-truck-line text-info fs-20"></i>
                      <p className="fw-semibold text-info mb-0 fs-13">Order Shipped</p>
                    </div>
                    <p className="text-muted fs-12 mb-0">Waiting for customer to confirm receipt.</p>
                    {req.trackingNumber && (
                      <p className="text-muted fs-12 mb-0 mt-1">
                        Tracking No.:&nbsp;
                        <span className="font-monospace fw-semibold text-body">{req.trackingNumber}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* ── Completed ── */}
                {(status === "COMPLETED" || status === "RECEIVED") && (
                  <div className="p-3 rounded-3"
                    style={{ background: "var(--vz-success-bg-subtle)", border: "1px solid var(--vz-success-border-subtle)" }}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <i className="ri-checkbox-circle-line text-success fs-20"></i>
                      <p className="fw-semibold text-success mb-0 fs-13">Order Completed</p>
                    </div>
                    <p className="text-muted fs-12 mb-0">
                      Customer confirmed receipt on {fmtDate(req.completedTime)}.
                    </p>
                  </div>
                )}

                {/* ── Cancelled ── */}
                {status === "CANCELLED" && (
                  <div className="d-flex align-items-center gap-3 p-3 rounded-3"
                    style={{ background: "var(--vz-danger-bg-subtle)", border: "1px solid var(--vz-danger-border-subtle)" }}>
                    <i className="ri-close-circle-line text-danger fs-22"></i>
                    <p className="fw-semibold text-danger mb-0 fs-13">Order Cancelled</p>
                  </div>
                )}
              </SectionCard>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter className="justify-content-between" style={{ borderColor: "var(--vz-border-color)" }}>
          <Button color="info" outline className="rounded-3" onClick={onWalletClick}>
            <i className="ri-wallet-3-line me-1"></i>View Wallet History
          </Button>
          <Button color="light" onClick={onClose} className="rounded-3">Close</Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const AdminRequests = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("role") !== "ADMIN") {
      showToast.error("Admin access required");
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const [requests, setRequests]           = useState<AdminRequest[]>([]);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [activeStatus, setActiveStatus]     = useState("");
  const [searchInput,  setSearchInput]      = useState("");
  const [startDate,    setStartDate]        = useState("");
  const [endDate,      setEndDate]          = useState("");

  // Modals
  const [detailOpen,    setDetailOpen]    = useState(false);
  const [detailTarget,  setDetailTarget]  = useState<AdminRequest | null>(null);
  const [shipOpen,      setShipOpen]      = useState(false);
  const [shipTarget,    setShipTarget]    = useState<AdminRequest | null>(null);
  const [walletOpen,    setWalletOpen]    = useState(false);
  const [walletUserId,  setWalletUserId]  = useState(0);
  const [walletUser,    setWalletUser]    = useState<string | undefined>(undefined);
  const [receiptOpen,   setReceiptOpen]   = useState(false);
  const [receiptUrl,    setReceiptUrl]    = useState("");

  // Payment approval
  const [approvingPayment, setApprovingPayment] = useState(false);
  const [rejectingPayment, setRejectingPayment] = useState(false);

  const loadRequests = useCallback(async (
    p: number,
    filters: AdminRequestFilters
  ) => {
    setLoading(true);
    try {
      const res = await getAdminRequests(p, PAGE_SIZE, filters);
      if (res.code === 200) {
        const content = res.data?.content ?? [];
        setRequests(content);
        setTotalPages(res.data?.totalPages ?? 0);
        setTotalElements(res.data?.totalElements ?? content.length);
      } else {
        setRequests([]);
        showToast.error(res.msg || "Failed to load requests");
      }
    } catch {
      setRequests([]);
      showToast.error("Network error — could not load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  const currentFilters = useCallback((): AdminRequestFilters => ({
    status:    activeStatus || undefined,
    keyword:   searchInput.trim() || undefined,
    startDate: startDate || undefined,
    endDate:   endDate || undefined,
  }), [activeStatus, searchInput, startDate, endDate]);

  // Initial load
  useEffect(() => {
    loadRequests(0, {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRequests]);

  const applyFilters = (overrides: Partial<AdminRequestFilters> = {}) => {
    const f: AdminRequestFilters = {
      status:    overrides.status    !== undefined ? overrides.status    : (activeStatus || undefined),
      keyword:   overrides.keyword   !== undefined ? overrides.keyword   : (searchInput.trim() || undefined),
      startDate: overrides.startDate !== undefined ? overrides.startDate : (startDate || undefined),
      endDate:   overrides.endDate   !== undefined ? overrides.endDate   : (endDate || undefined),
    };
    setPage(0);
    loadRequests(0, f);
  };

  const handleStatusTab = (status: string) => {
    setActiveStatus(status);
    setPage(0);
    loadRequests(0, {
      status:    status || undefined,
      keyword:   searchInput.trim() || undefined,
      startDate: startDate || undefined,
      endDate:   endDate || undefined,
    });
  };

  const handleApply = () => {
    setPage(0);
    loadRequests(0, {
      status:    activeStatus || undefined,
      keyword:   searchInput.trim() || undefined,
      startDate: startDate || undefined,
      endDate:   endDate || undefined,
    });
  };

  const handleReset = () => {
    setActiveStatus("");
    setSearchInput("");
    setStartDate("");
    setEndDate("");
    setPage(0);
    loadRequests(0, {});
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    loadRequests(p, currentFilters());
  };

  const openDetail = (req: AdminRequest) => {
    setDetailTarget(req);
    setDetailOpen(true);
  };

  const openShip = (req: AdminRequest) => {
    setShipTarget(req);
    setShipOpen(true);
  };

  const handleShipFromDetail = () => {
    if (detailTarget) openShip(detailTarget);
  };

  const handleShipSuccess = (trackingNumber: string) => {
    // Close ship modal only — keep detail modal open with updated data
    setShipOpen(false);
    setDetailTarget((prev) => prev ? { ...prev, status: "SHIPPED", trackingNumber } : prev);
    loadRequests(page, {
      status:    activeStatus || undefined,
      keyword:   searchInput.trim() || undefined,
      startDate: startDate || undefined,
      endDate:   endDate || undefined,
    });
  };

  const handleApprovePayment = async () => {
    if (!detailTarget) return;
    setApprovingPayment(true);
    try {
      const res = await approvePayment(detailTarget.id);
      if (res.code === 200) {
        showToast.success("Payment verified!");
        // Patch detailTarget in-place — modal stays open showing updated state
        setDetailTarget((prev) => prev ? { ...prev, paymentStatus: "PAID" } : prev);
        loadRequests(page, {
          status: activeStatus || undefined,
          keyword: searchInput.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
      } else {
        showToast.error(res.message || res.msg || "Failed to verify payment");
      }
    } catch {
      showToast.error("Network error");
    } finally {
      setApprovingPayment(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!detailTarget) return;
    setRejectingPayment(true);
    try {
      const res = await rejectPayment(detailTarget.id);
      if (res.code === 200) {
        showToast.success("Payment rejected.");
        // Patch detailTarget in-place — modal stays open showing updated state
        setDetailTarget((prev) => prev ? { ...prev, paymentStatus: "REJECTED" } : prev);
        loadRequests(page, {
          status: activeStatus || undefined,
          keyword: searchInput.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
      } else {
        showToast.error(res.message || res.msg || "Failed to reject payment");
      }
    } catch {
      showToast.error("Network error");
    } finally {
      setRejectingPayment(false);
    }
  };

  const openWalletHistory = () => {
    if (!detailTarget) return;
    setWalletUserId(detailTarget.userId);
    setWalletUser(detailTarget.username);
    setWalletOpen(true);
  };

  const openReceipt = (url: string) => {
    setReceiptUrl(url);
    setReceiptOpen(true);
  };

  const pageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const start = Math.max(0, Math.min(page - 2, totalPages - 5));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  };

  document.title = "Request Management | Admin";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>

          {/* Breadcrumb */}
          <Row>
            <Col xs={12}>
              <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                <h4 className="mb-sm-0">Request Management</h4>
                <ol className="breadcrumb m-0">
                  <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
                  <li className="breadcrumb-item active">Requests</li>
                </ol>
              </div>
            </Col>
          </Row>

          {/* ── Filters Card ────────────────────────────────────────────────── */}
          <Card className="border-0 shadow-sm mb-3">
            <CardBody className="py-3">
              {/* Status tabs */}
              <div className="d-flex gap-2 flex-wrap mb-3">
                {STATUS_TABS.map((tab) => (
                  <button key={tab.value} type="button"
                    onClick={() => handleStatusTab(tab.value)}
                    className={`btn btn-sm rounded-3 ${activeStatus === tab.value ? "btn-primary" : "btn-soft-secondary"}`}
                    style={{ paddingInline: 14 }}>
                    <i className={`${tab.icon} me-1`}></i>{tab.label}
                    {/* Show count badge on the active tab if we have a total */}
                    {activeStatus === tab.value && totalElements > 0 && (
                      <span className="badge bg-white text-primary ms-1 fs-10">{totalElements}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search + date range */}
              <Row className="g-2 align-items-end">
                <Col sm={4} xs={12}>
                  <Label className="form-label fs-12 mb-1">Search Request ID</Label>
                  <InputGroup>
                    <span className="input-group-text bg-white border-end-0" style={{ borderRadius: "8px 0 0 8px" }}>
                      <i className="ri-search-line text-muted fs-14"></i>
                    </span>
                    <Input
                      type="text"
                      placeholder="Request ID…"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleApply()}
                      className="border-start-0 ps-0"
                      style={{ borderRadius: "0 8px 8px 0" }}
                    />
                  </InputGroup>
                </Col>
                <Col sm={3} xs={6}>
                  <Label className="form-label fs-12 mb-1">Start Date</Label>
                  <Input type="date" value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ borderRadius: 8 }} />
                </Col>
                <Col sm={3} xs={6}>
                  <Label className="form-label fs-12 mb-1">End Date</Label>
                  <Input type="date" value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ borderRadius: 8 }} />
                </Col>
                <Col sm="auto" xs={12} className="d-flex gap-2">
                  <Button color="primary" className="rounded-3" onClick={handleApply}
                    style={{ paddingInline: 18 }}>
                    <i className="ri-filter-3-line me-1"></i>Apply
                  </Button>
                  <Button color="light" className="rounded-3" onClick={handleReset}
                    style={{ paddingInline: 14 }}>
                    <i className="ri-refresh-line me-1"></i>Reset
                  </Button>
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* ── Requests Table ───────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="d-flex align-items-center border-bottom-dashed">
              <h5 className="card-title mb-0 flex-grow-1">
                <i className="ri-truck-line me-2 text-primary align-middle"></i>
                All Requests
                {totalElements > 0 && (
                  <span className="badge bg-primary-subtle text-primary ms-2 fs-12">
                    {totalElements}
                  </span>
                )}
              </h5>
            </CardHeader>

            <CardBody>
              {loading ? (
                <div className="text-center py-5"><Spinner color="primary" /></div>
              ) : requests.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="ri-truck-line d-block mb-2 opacity-25" style={{ fontSize: 52 }}></i>
                  <p className="fs-14 mb-0">No requests found.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table className="table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="text-muted" style={{ width: 40 }}>#</th>
                          <th className="text-muted">Request ID</th>
                          <th className="text-muted">Username</th>
                          <th className="text-muted">Email</th>
                          <th className="text-muted">Payment Method</th>
                          <th className="text-muted">Status</th>
                          <th className="text-muted">Payment Status</th>
                          <th className="text-muted">Created</th>
                          <th className="text-muted">Tracking No.</th>
                          <th className="text-muted text-center" style={{ width: 120 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((req, i) => (
                          <tr key={req.id}>
                            <td className="text-muted fs-13">{page * PAGE_SIZE + i + 1}</td>

                            <td>
                              <button type="button"
                                className="btn btn-link p-0 fw-semibold fs-13 text-primary"
                                style={{ textDecoration: "none" }}
                                onClick={() => openDetail(req)}>
                                #{req.id}
                              </button>
                            </td>

                            <td className="fw-medium fs-13">
                              {req.username ?? <span className="text-muted">#{req.userId}</span>}
                            </td>

                            <td className="text-muted fs-13">
                              {req.email
                                ? <a href={`mailto:${req.email}`} className="text-primary" style={{ textDecoration: "none" }}>{req.email}</a>
                                : "—"}
                            </td>

                            <td>
                              {req.redeemType === "WALLET" ? (
                                <span className="badge bg-success-subtle text-success">
                                  <i className="ri-wallet-3-line me-1"></i>Wallet
                                </span>
                              ) : req.redeemType === "BANK_TRANSFER" ? (
                                <span className="badge bg-primary-subtle text-primary">
                                  <i className="ri-bank-line me-1"></i>Banking
                                </span>
                              ) : (
                                <span className="badge bg-warning-subtle text-warning">
                                  <i className="ri-star-fill me-1"></i>Points
                                </span>
                              )}
                            </td>

                            <td><StatusBadge status={req.status} /></td>

                            <td>
                              {req.paymentStatus
                                ? <PaymentStatusBadge status={req.paymentStatus} />
                                : <span className="text-muted fs-13">—</span>
                              }
                            </td>

                            <td className="text-muted fs-13">{fmtDate(req.createTime)}</td>

                            <td className="fs-13">
                              {req.trackingNumber
                                ? <span className="fw-medium font-monospace text-body">{req.trackingNumber}</span>
                                : <span className="text-muted">—</span>
                              }
                            </td>

                            <td>
                              <div className="d-flex gap-1 justify-content-center flex-wrap">
                                <Button color="primary" size="sm" outline className="rounded-3"
                                  onClick={() => openDetail(req)}>
                                  <i className="ri-eye-line me-1"></i>View
                                </Button>
                                {req.redeemType === "BANK_TRANSFER" && req.receiptUrl && (
                                  <Button color="secondary" size="sm" outline className="rounded-3"
                                    onClick={() => openReceipt(req.receiptUrl!)}>
                                    <i className="ri-image-line me-1"></i>Receipt
                                  </Button>
                                )}
                                {/* Ship button: non-bank pending OR bank transfer payment verified */}
                                {(
                                  (req.redeemType !== "BANK_TRANSFER" && req.status?.toUpperCase() === "PENDING") ||
                                  (req.redeemType === "BANK_TRANSFER" && req.paymentStatus?.toUpperCase() === "PAID" && req.status?.toUpperCase() === "PENDING")
                                ) && (
                                  <Button color="info" size="sm" outline className="rounded-3"
                                    onClick={() => openShip(req)}>
                                    <i className="ri-truck-line me-1"></i>Ship
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Row className="align-items-center mt-3 g-3">
                      <div className="col-sm">
                        <p className="text-muted mb-0 fs-13">
                          Showing{" "}
                          <span className="fw-semibold">
                            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)}
                          </span>{" "}
                          of <span className="fw-semibold">{totalElements}</span> requests
                        </p>
                      </div>
                      <div className="col-sm-auto">
                        <ul className="pagination pagination-separated pagination-md justify-content-center justify-content-sm-end mb-0">
                          <li className={page === 0 ? "page-item disabled" : "page-item"}>
                            <button className="page-link" onClick={() => handlePageChange(page - 1)}>
                              <i className="ri-arrow-left-s-line"></i>
                            </button>
                          </li>
                          {pageNumbers().map((i) => (
                            <li key={i} className={page === i ? "page-item active" : "page-item"}>
                              <button className="page-link" onClick={() => handlePageChange(i)}>{i + 1}</button>
                            </li>
                          ))}
                          <li className={page >= totalPages - 1 ? "page-item disabled" : "page-item"}>
                            <button className="page-link" onClick={() => handlePageChange(page + 1)}>
                              <i className="ri-arrow-right-s-line"></i>
                            </button>
                          </li>
                        </ul>
                      </div>
                    </Row>
                  )}
                </>
              )}
            </CardBody>
          </Card>

        </Container>
      </div>

      {/* Detail Modal */}
      <DetailModal
        req={detailTarget}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onShipClick={handleShipFromDetail}
        onWalletClick={openWalletHistory}
        onApprovePayment={handleApprovePayment}
        onRejectPayment={handleRejectPayment}
        approvingPayment={approvingPayment}
        rejectingPayment={rejectingPayment}
        onViewReceipt={openReceipt}
      />

      {/* Ship Modal */}
      <ShipModal
        req={shipTarget}
        open={shipOpen}
        onClose={() => setShipOpen(false)}
        onShipped={handleShipSuccess}
      />

      {/* Wallet History Modal (page-level to avoid z-index conflicts) */}
      <WalletHistoryModal
        open={walletOpen}
        userId={walletUserId}
        username={walletUser}
        onClose={() => setWalletOpen(false)}
      />

      {/* Receipt View Modal */}
      <ReceiptModal
        open={receiptOpen}
        url={receiptUrl}
        onClose={() => setReceiptOpen(false)}
      />

    </React.Fragment>
  );
};

export default AdminRequests;
