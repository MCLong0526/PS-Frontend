import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, CardBody, Button, Spinner } from "reactstrap";
import { getMyRequests, completeRequest, getProductById, MyRequest, ProductImage } from "../../helpers/productApi";
import { showToast } from "../../helpers/appToast";

const PAGE_SIZE = 12;

const fmtDate = (d: string) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-MY", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return d; }
};

// ── Status helpers ─────────────────────────────────────────────────────────────

type TabValue = "" | "PENDING" | "SHIPPED" | "COMPLETED";

const STATUS_TABS: { label: string; value: TabValue; icon: string; color: string }[] = [
  { label: "All",       value: "",          icon: "ri-list-unordered",      color: "primary" },
  { label: "Pending",   value: "PENDING",   icon: "ri-time-line",            color: "warning" },
  { label: "Shipped",   value: "SHIPPED",   icon: "ri-truck-line",           color: "info" },
  { label: "Completed", value: "COMPLETED", icon: "ri-checkbox-circle-line", color: "success" },
];

const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toUpperCase();
  if (s === "PENDING")   return <span className="badge bg-warning-subtle text-warning">Pending</span>;
  if (s === "SHIPPED")   return <span className="badge bg-info-subtle text-info">Shipped</span>;
  if (s === "COMPLETED") return <span className="badge bg-success-subtle text-success">Completed</span>;
  if (s === "CANCELLED") return <span className="badge bg-danger-subtle text-danger">Cancelled</span>;
  return <span className="badge bg-secondary-subtle text-secondary">{status || "—"}</span>;
};

const PaymentStatusBadge = ({ paymentStatus }: { paymentStatus?: string }) => {
  if (!paymentStatus) return null;
  const s = paymentStatus.toUpperCase();
  if (s === "PAID")     return <span className="badge bg-success-subtle text-success fs-10"><i className="ri-checkbox-circle-line me-1"></i>Paid</span>;
  if (s === "REJECTED") return <span className="badge bg-danger-subtle text-danger fs-10"><i className="ri-close-circle-line me-1"></i>Rejected</span>;
  if (s === "PENDING")  return <span className="badge" style={{ background: "#ede7f6", color: "#6a1b9a", fontSize: 10 }}><i className="ri-time-line me-1"></i>Awaiting Verification</span>;
  return null;
};

// ── Product image thumbnail (used inside card) ────────────────────────────────

const CardImage: React.FC<{
  images?: ProductImage[];
  productId: number;
  name?: string;
}> = ({ images, productId, name }) => {
  const [sel,           setSel]           = useState(0);
  const [fetchedImages, setFetchedImages] = useState<ProductImage[]>([]);
  const [fetching,      setFetching]      = useState(false);

  const display = (images && images.length > 0) ? images : fetchedImages;

  useEffect(() => { setSel(0); }, [display.length]);

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

  return (
    <div>
      {/* Main image */}
      <div className="rounded-3 overflow-hidden d-flex align-items-center justify-content-center mb-2"
        style={{ height: 160, background: "#f8f9fa", border: "1px solid var(--vz-border-color)" }}>
        {fetching ? (
          <Spinner size="sm" color="secondary" />
        ) : display.length > 0 ? (
          <img src={display[sel].imageUrl} alt={name ?? "product"}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        ) : (
          <i className="ri-image-line text-muted" style={{ fontSize: 40, opacity: 0.3 }}></i>
        )}
      </div>
      {/* Thumbnails — only shown when multiple images */}
      {display.length > 1 && (
        <div className="d-flex gap-2 flex-wrap mb-1">
          {display.map((img, i) => (
            <div key={img.id} role="button" onClick={() => setSel(i)}
              className="rounded-2 overflow-hidden flex-shrink-0 d-flex align-items-center justify-content-center"
              style={{
                width: 40, height: 40, background: "#f8f9fa", cursor: "pointer",
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

// ── Request Card ──────────────────────────────────────────────────────────────

const RequestCard: React.FC<{
  req: MyRequest;
  index: number;
  page: number;
  completing: boolean;
  onComplete: () => void;
}> = ({ req, index, page, completing, onComplete }) => {
  const isWallet  = req.redeemType === "WALLET";
  const isBank    = req.redeemType === "BANK_TRANSFER";
  const isShipped = req.status?.toUpperCase() === "SHIPPED";

  return (
    <Card className="card-animate border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
      <CardBody className="d-flex flex-column p-4 gap-0">

        {/* ── Product image ──────────────────────────────────────────── */}
        <CardImage images={req.productImages} productId={req.productId} name={req.productName} />

        {/* ── Product name + status ──────────────────────────────────── */}
        <div className="d-flex align-items-start justify-content-between gap-2 mt-3 mb-3">
          <div className="flex-grow-1 min-w-0">
            <p className="text-muted fs-11 text-uppercase fw-medium mb-1">
              #{page * PAGE_SIZE + index + 1}
            </p>
            <h6 className="fw-semibold mb-0 fs-14" style={{
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>
              {req.productName ?? `Product #${req.productId}`}
            </h6>
          </div>
          <div className="flex-shrink-0 pt-1 d-flex flex-column align-items-end gap-1">
            <StatusBadge status={req.status} />
            <PaymentStatusBadge paymentStatus={req.paymentStatus} />
          </div>
        </div>

        {/* ── Redeem method + amount ─────────────────────────────────── */}
        <div className="d-flex gap-3 rounded-3 p-3 mb-3"
          style={{ background: "var(--vz-secondary-bg)", border: "1px solid var(--vz-border-color)" }}>
          <div className="flex-grow-1">
            <p className="text-muted fs-11 text-uppercase fw-medium mb-1">Redeemed using</p>
            {isWallet ? (
              <span className="badge bg-success-subtle text-success fs-11">
                <i className="ri-wallet-3-line me-1"></i>Wallet
              </span>
            ) : isBank ? (
              <span className="badge bg-primary-subtle text-primary fs-11">
                <i className="ri-bank-line me-1"></i>Banking
              </span>
            ) : (
              <span className="badge bg-warning-subtle text-warning fs-11">
                <i className="ri-star-fill me-1"></i>Points
              </span>
            )}
          </div>
          <div className="text-end">
            <p className="text-muted fs-11 text-uppercase fw-medium mb-1">Amount</p>
            {isWallet || isBank ? (
              <span className={`fw-bold fs-14 ${isBank ? "text-primary" : "text-success"}`}>
                RM {Number(req.amountWallet ?? 0).toFixed(2)}
              </span>
            ) : (
              <span className="fw-bold text-warning fs-14">
                <i className="ri-star-fill me-1 fs-11 align-middle"></i>{req.amountPoints ?? 0}
              </span>
            )}
          </div>
        </div>

        {/* ── Dates + tracking ──────────────────────────────────────── */}
        <div className="flex-grow-1 d-flex flex-column gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <i className="ri-calendar-line text-muted fs-13 flex-shrink-0"></i>
            <span className="text-muted fs-12">{fmtDate(req.createTime)}</span>
          </div>
          {req.trackingNumber ? (
            <div className="d-flex align-items-center gap-2">
              <i className="ri-truck-line text-info fs-13 flex-shrink-0"></i>
              <span className="font-monospace fw-medium fs-12 text-body">{req.trackingNumber}</span>
            </div>
          ) : (
            <div className="d-flex align-items-center gap-2">
              <i className="ri-map-pin-line text-muted fs-13 flex-shrink-0"></i>
              <span className="text-muted fs-12">No tracking number yet</span>
            </div>
          )}
        </div>

        {/* ── Confirm Received (SHIPPED only) ───────────────────────── */}
        {isShipped && (
          <Button color="success" size="sm" disabled={completing} onClick={onComplete}
            className="rounded-3 w-100">
            {completing
              ? <><Spinner size="sm" className="me-1" />Confirming…</>
              : <><i className="ri-checkbox-circle-line me-1"></i>Confirm Received</>
            }
          </Button>
        )}
      </CardBody>
    </Card>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const MyRequests = () => {
  const [allRequests, setAllRequests]           = useState<MyRequest[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [page, setPage]                         = useState(0);
  const [totalPages, setTotalPages]             = useState(0);
  const [totalElements, setTotalElements]       = useState(0);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [activeTab, setActiveTab]       = useState<TabValue>("");

  const loadRequests = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await getMyRequests(p, PAGE_SIZE);
      if (res.code === 200) {
        const content = res.data?.content ?? [];
        setAllRequests(content);
        setTotalPages(res.data?.totalPages ?? 0);
        setTotalElements(res.data?.totalElements ?? content.length);
      } else {
        setAllRequests([]);
        showToast.error(res.msg || "Failed to load requests");
      }
    } catch {
      setAllRequests([]);
      showToast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(0); }, [loadRequests]);

  const handleComplete = async (req: MyRequest) => {
    setCompletingId(req.id);
    try {
      const res = await completeRequest(req.id);
      if (res.code === 200) {
        showToast.success("Marked as received!");
        // Patch the specific card in-place — no full reload flicker
        setAllRequests((prev) =>
          prev.map((r) => r.id === req.id ? { ...r, status: "COMPLETED" } : r)
        );
      } else {
        showToast.error(res.msg || "Failed to confirm receipt");
      }
    } catch {
      showToast.error("Network error");
    } finally {
      setCompletingId(null);
    }
  };

  const handlePageChange = (p: number) => { setPage(p); loadRequests(p); };

  const pageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const start = Math.max(0, Math.min(page - 2, totalPages - 5));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  };

  // Local tab filter (applied on top of loaded page)
  const displayed = activeTab
    ? allRequests.filter((r) => r.status?.toUpperCase() === activeTab)
    : allRequests;

  // Count per tab from current page data
  const countFor = (tab: TabValue) =>
    tab ? allRequests.filter((r) => r.status?.toUpperCase() === tab).length : allRequests.length;

  document.title = "My Requests | Dashboard";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>

          {/* Breadcrumb */}
          <Row>
            <Col xs={12}>
              <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                <h4 className="mb-sm-0">My Requests</h4>
                <ol className="breadcrumb m-0">
                  <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
                  <li className="breadcrumb-item active">My Requests</li>
                </ol>
              </div>
            </Col>
          </Row>

          {/* ── Status Tabs Card ──────────────────────────────────────────── */}
          <Card className="border-0 shadow-sm mb-3">
            <CardBody className="py-3">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex gap-2 flex-wrap">
                  {STATUS_TABS.map((tab) => {
                    const count = countFor(tab.value);
                    const active = activeTab === tab.value;
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveTab(tab.value)}
                        className={`btn btn-sm rounded-3 ${active ? `btn-${tab.color}` : "btn-soft-secondary"}`}
                        style={{ paddingInline: 14 }}
                      >
                        <i className={`${tab.icon} me-1`}></i>
                        {tab.label}
                        {!loading && count > 0 && (
                          <span className={`badge ms-1 fs-10 ${active ? "bg-white text-" + tab.color : "bg-secondary-subtle text-secondary"}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {totalElements > 0 && (
                  <span className="text-muted fs-13">
                    <span className="fw-semibold">{totalElements}</span> total request{totalElements !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </CardBody>
          </Card>

          {/* ── Content Area ─────────────────────────────────────────────── */}
          {loading ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
              <p className="text-muted mt-3 mb-0 fs-14">Loading your requests…</p>
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-5">
              <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{ width: 80, height: 80, background: "var(--vz-secondary-bg)", border: "1px solid var(--vz-border-color)" }}>
                <i className="ri-list-check-2 text-muted" style={{ fontSize: 36 }}></i>
              </div>
              <h5 className="text-muted fw-medium mb-1">
                {activeTab ? `No ${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} requests` : "No requests yet"}
              </h5>
              <p className="text-muted fs-14 mb-0">
                {activeTab
                  ? "Try switching to a different status tab."
                  : "Your redemption requests will appear here once you make them."}
              </p>
            </div>
          ) : (
            <>
              <Row className="g-3">
                {displayed.map((req, i) => (
                  <Col key={req.id} xl={4} md={6} xs={12}>
                    <RequestCard
                      req={req}
                      index={i}
                      page={page}
                      completing={completingId === req.id}
                      onComplete={() => handleComplete(req)}
                    />
                  </Col>
                ))}
              </Row>

              {/* Pagination */}
              {totalPages > 1 && (
                <Row className="align-items-center mt-4 g-3">
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

        </Container>
      </div>
    </React.Fragment>
  );
};

export default MyRequests;
