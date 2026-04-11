import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Container, Row, Col, Card, CardBody, CardHeader,
  Modal, ModalBody, ModalFooter,
  Button, Spinner, Input, InputGroup, FormGroup, Label,
} from "reactstrap";
import {
  getNormalProducts, redeemProduct, getAddresses, createAddress,
  Product, Address, AddressPayload,
} from "../../helpers/productApi";
import {
  getPublicPaymentSettings, redeemProductBankTransfer,
  PaymentSettings,
} from "../../helpers/paymentApi";
import { showToast } from "../../helpers/appToast";

const PAGE_SIZE_GRID = 9;
const PAGE_SIZE_LIST = 8;

type ViewMode = "grid" | "list";

const EMPTY_ADDR: AddressPayload = {
  receiverName: "", phone: "",
  addressLine1: "", addressLine2: "",
  city: "", state: "", postcode: "", country: "Malaysia",
};

// ── Shared UI helpers ─────────────────────────────────────────────────────────

const NoImageBox = ({ size = 48 }: { size?: number }) => (
  <div className="d-flex align-items-center justify-content-center w-100 h-100">
    <i className="ri-image-line text-muted" style={{ fontSize: size, opacity: 0.25 }}></i>
  </div>
);

const StockBadge = ({ qty }: { qty: number }) =>
  qty > 0
    ? <span className="badge bg-success rounded-pill" style={{ fontSize: 10.5 }}>{qty} left</span>
    : <span className="badge bg-danger  rounded-pill" style={{ fontSize: 10.5 }}>Out of Stock</span>;

const PricePill = ({
  type, wallet, points,
}: { type: "wallet" | "points"; wallet: number; points: number }) =>
  type === "wallet" ? (
    <div className="flex-grow-1 text-center p-2 rounded-3"
      style={{ background: "var(--vz-success-bg-subtle)", border: "1px solid var(--vz-success-border-subtle)" }}>
      <div className="fs-10 text-uppercase fw-semibold mb-1" style={{ color: "#888", letterSpacing: 0.4 }}>Wallet</div>
      <div className="fw-bold text-success" style={{ fontSize: 14 }}>RM {Number(wallet).toFixed(2)}</div>
    </div>
  ) : (
    <div className="flex-grow-1 text-center p-2 rounded-3"
      style={{ background: "var(--vz-warning-bg-subtle)", border: "1px solid var(--vz-warning-border-subtle)" }}>
      <div className="fs-10 text-uppercase fw-semibold mb-1" style={{ color: "#888", letterSpacing: 0.4 }}>Points</div>
      <div className="fw-bold text-warning" style={{ fontSize: 14 }}>
        <i className="ri-star-fill me-1" style={{ fontSize: 10 }}></i>{points}
      </div>
    </div>
  );

// Full image — objectFit contain so nothing is cropped
const ProductImg = ({
  src, alt, height = 200, padding = 16,
}: { src?: string; alt: string; height?: number; padding?: number }) => (
  <div style={{ height, background: "#f8f9fa", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
    {src
      ? <img src={src} alt={alt} loading="lazy"
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding, display: "block" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      : <NoImageBox size={52} />
    }
  </div>
);

// ── Grid Card ─────────────────────────────────────────────────────────────────

const GridCard: React.FC<{ product: Product; onOpen: (p: Product) => void }> = ({ product, onOpen }) => {
  const img      = product.images?.[0]?.imageUrl;
  const inStock  = product.quantity > 0;
  const imgCount = product.images?.length ?? 0;

  return (
    <Card className="card-animate border-0 h-100 mb-0"
      style={{ borderRadius: 12, overflow: "hidden", cursor: "pointer" }}
      onClick={() => onOpen(product)}>

      <div style={{ position: "relative" }}>
        <ProductImg src={img} alt={product.name} height={200} padding={16} />
        <div className="position-absolute" style={{ top: 10, left: 10 }}>
          <StockBadge qty={product.quantity} />
        </div>
        {imgCount > 1 && (
          <div className="position-absolute" style={{ bottom: 10, right: 10 }}>
            <span className="badge bg-dark bg-opacity-60 rounded-pill" style={{ fontSize: 10.5 }}>
              <i className="ri-image-2-line me-1"></i>{imgCount}
            </span>
          </div>
        )}
      </div>

      <CardBody className="p-3 d-flex flex-column">
        <h6 className="fw-semibold mb-1 text-truncate fs-14" title={product.name}>
          {product.name}
        </h6>
        <p className="text-muted fs-13 mb-3 flex-grow-1"
          style={{
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as any, overflow: "hidden",
            lineHeight: 1.55, minHeight: "2.6em",
          }}>
          {product.description || "No description available."}
        </p>
        <div className="d-flex gap-2 mb-3">
          <PricePill type="wallet" wallet={product.priceWallet} points={product.pricePoints} />
          <PricePill type="points" wallet={product.priceWallet} points={product.pricePoints} />
        </div>
        <Button color={inStock ? "primary" : "secondary"} size="sm" className="w-100 rounded-3"
          disabled={!inStock}
          onClick={(e) => { e.stopPropagation(); onOpen(product); }}>
          {inStock
            ? <><i className="ri-shopping-bag-line me-1"></i>Redeem Now</>
            : "Out of Stock"}
        </Button>
      </CardBody>
    </Card>
  );
};

// ── List Row ──────────────────────────────────────────────────────────────────

const ListRow: React.FC<{ product: Product; onOpen: (p: Product) => void }> = ({ product, onOpen }) => {
  const img      = product.images?.[0]?.imageUrl;
  const inStock  = product.quantity > 0;
  const imgCount = product.images?.length ?? 0;

  return (
    <Card className="card-animate border mb-0" style={{ borderRadius: 10, cursor: "pointer" }}
      onClick={() => onOpen(product)}>
      <CardBody className="p-3">
        <div className="d-flex align-items-center gap-3">
          {/* Thumbnail */}
          <div style={{
            width: 90, height: 90, flexShrink: 0, borderRadius: 8,
            overflow: "hidden", background: "#f8f9fa",
            border: "1px solid var(--vz-border-color)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {img
              ? <img src={img} alt={product.name} loading="lazy"
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: 6, display: "block" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              : <NoImageBox size={28} />
            }
          </div>

          {/* Info */}
          <div className="flex-grow-1 min-w-0">
            <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
              <span className="fw-semibold fs-14 text-truncate">{product.name}</span>
              <StockBadge qty={product.quantity} />
              {imgCount > 1 && (
                <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: 10.5 }}>
                  <i className="ri-image-2-line me-1"></i>{imgCount} photos
                </span>
              )}
            </div>
            <p className="text-muted fs-13 mb-0 text-truncate">
              {product.description || "No description available."}
            </p>
          </div>

          {/* Prices — hidden on small screens */}
          <div className="d-none d-md-flex gap-2 flex-shrink-0">
            <div className="text-center px-3 py-2 rounded-3"
              style={{ background: "var(--vz-success-bg-subtle)", border: "1px solid var(--vz-success-border-subtle)", minWidth: 90 }}>
              <div className="fs-10 text-uppercase fw-semibold mb-1" style={{ color: "#888" }}>Wallet</div>
              <div className="fw-bold text-success fs-13">RM {Number(product.priceWallet).toFixed(2)}</div>
            </div>
            <div className="text-center px-3 py-2 rounded-3"
              style={{ background: "var(--vz-warning-bg-subtle)", border: "1px solid var(--vz-warning-border-subtle)", minWidth: 90 }}>
              <div className="fs-10 text-uppercase fw-semibold mb-1" style={{ color: "#888" }}>Points</div>
              <div className="fw-bold text-warning fs-13">
                <i className="ri-star-fill me-1" style={{ fontSize: 10 }}></i>{product.pricePoints}
              </div>
            </div>
          </div>

          {/* Button */}
          <Button color={inStock ? "primary" : "secondary"} size="sm"
            className="flex-shrink-0 rounded-3" disabled={!inStock}
            onClick={(e) => { e.stopPropagation(); onOpen(product); }}>
            {inStock ? <><i className="ri-shopping-bag-line me-1"></i>Redeem</> : "Out of Stock"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

// ── Redeem Modal ───────────────────────────────────────────────────────────────

const RedeemModal: React.FC<{
  product: Product;
  open: boolean;
  onClose: () => void;
  onConfirm: (type: "POINT" | "WALLET" | "BANK_TRANSFER", addressId: number, receiptFile?: File) => void;
  redeeming: boolean;
}> = ({ product, open, onClose, onConfirm, redeeming }) => {
  const images = product.images ?? [];

  // Image gallery
  const [activeImg,  setActiveImg]  = useState(images[0]?.imageUrl ?? "");
  // Redeem method
  const [redeemType, setRedeemType] = useState<"POINT" | "WALLET" | "BANK_TRANSFER">("WALLET");
  // Address
  const [addresses,     setAddresses]     = useState<Address[]>([]);
  const [loadingAddr,   setLoadingAddr]   = useState(false);
  const [selectedAddr,  setSelectedAddr]  = useState<number | null>(null);
  const [showAddForm,   setShowAddForm]   = useState(false);
  const [savingAddr,    setSavingAddr]    = useState(false);
  const [addrForm,      setAddrForm]      = useState<AddressPayload>(EMPTY_ADDR);
  // Bank payment
  const [bankSettings,   setBankSettings]   = useState<PaymentSettings | null>(null);
  const [loadingBank,    setLoadingBank]    = useState(false);
  const [receiptFile,    setReceiptFile]    = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Reset & fetch on open
  useEffect(() => {
    if (!open) return;
    setActiveImg(images[0]?.imageUrl ?? "");
    setRedeemType("WALLET");
    setShowAddForm(false);
    setAddrForm(EMPTY_ADDR);
    setReceiptFile(null);
    setReceiptPreview(null);
    setBankSettings(null);

    setLoadingAddr(true);
    getAddresses()
      .then((res) => {
        if (res.code === 200) {
          const list = res.data ?? [];
          setAddresses(list);
          setSelectedAddr(list[0]?.id ?? null);
        } else {
          setAddresses([]);
          setSelectedAddr(null);
        }
      })
      .catch(() => { setAddresses([]); setSelectedAddr(null); })
      .finally(() => setLoadingAddr(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, open]);

  // Fetch bank settings when BANK is selected
  useEffect(() => {
    if (redeemType !== "BANK_TRANSFER" || bankSettings) return;
    setLoadingBank(true);
    getPublicPaymentSettings()
      .then((res) => { if (res.code === 200) setBankSettings(res.data); })
      .catch(() => {})
      .finally(() => setLoadingBank(false));
  }, [redeemType, bankSettings]);

  const handleReceiptSelect = (file: File) => {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  const patchAddr = (field: keyof AddressPayload) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setAddrForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSaveAddr = async () => {
    const { receiverName, phone, addressLine1, city, state, postcode, country } = addrForm;
    if (!receiverName || !phone || !addressLine1 || !city || !state || !postcode || !country) {
      showToast.error("Please fill in all required fields");
      return;
    }
    setSavingAddr(true);
    try {
      const res = await createAddress(addrForm);
      if (res.code === 200) {
        showToast.success("Address saved!");
        const listRes = await getAddresses();
        if (listRes.code === 200) {
          const list = listRes.data ?? [];
          setAddresses(list);
          // Auto-select the newly created address
          const newId: number = res.data?.id ?? list[list.length - 1]?.id;
          if (newId) setSelectedAddr(newId);
        }
        setShowAddForm(false);
        setAddrForm(EMPTY_ADDR);
      } else {
        showToast.error(res.msg || "Failed to save address");
      }
    } catch {
      showToast.error("Network error");
    } finally {
      setSavingAddr(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedAddr) {
      showToast.error("Please select a delivery address");
      return;
    }
    if (redeemType === "BANK_TRANSFER" && !receiptFile) {
      showToast.error("Please upload your payment receipt before submitting");
      return;
    }
    onConfirm(redeemType, selectedAddr, redeemType === "BANK_TRANSFER" ? (receiptFile ?? undefined) : undefined);
  };

  return (
    <Modal isOpen={open} toggle={() => !redeeming && onClose()} centered size="lg">

      {/* ── Two-panel container ──────────────────────────────────────────────── */}
      <ModalBody className="p-0" style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", height: 560, overflow: "hidden" }}>

          {/* LEFT — image gallery (fixed width, no scroll) */}
          <div style={{
            width: 270, flexShrink: 0,
            background: "#f8f9fa",
            borderRight: "1px solid var(--vz-border-color)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Close button */}
            <button type="button" className="btn-close position-absolute"
              style={{ top: 12, right: 12, zIndex: 10 }}
              onClick={onClose} disabled={redeeming} aria-label="Close" />

            {/* Main image — full display, no crop */}
            <div style={{
              flex: 1, minHeight: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 20, overflow: "hidden",
            }}>
              {activeImg
                ? <img src={activeImg} alt={product.name} loading="lazy"
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8, display: "block" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                : <NoImageBox size={64} />
              }
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 8,
                padding: "0 16px 12px", justifyContent: "center", flexShrink: 0,
              }}>
                {images.map((img, i) => {
                  const active = activeImg === img.imageUrl;
                  return (
                    <button key={i} type="button" onClick={() => setActiveImg(img.imageUrl)}
                      style={{
                        width: 54, height: 54, padding: 4, flexShrink: 0,
                        border: active ? "2.5px solid var(--vz-primary)" : "1.5px solid var(--vz-border-color)",
                        borderRadius: 8, overflow: "hidden", cursor: "pointer",
                        background: "#fff",
                        transition: "border-color 0.15s, transform 0.12s, box-shadow 0.12s",
                        transform: active ? "scale(1.08)" : "scale(1)",
                        boxShadow: active ? "0 2px 8px rgba(64,81,137,0.22)" : "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                      <img src={img.imageUrl} alt={`Photo ${i + 1}`} loading="lazy"
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
                    </button>
                  );
                })}
              </div>
            )}

            {images.length > 0 && (
              <p className="text-center text-muted mb-3 fs-11 flex-shrink-0">
                <i className="ri-image-2-line me-1"></i>
                {images.length} photo{images.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* RIGHT — scrollable product info + form */}
          <div style={{
            flex: 1, overflowY: "auto", minWidth: 0,
            display: "flex", flexDirection: "column",
            padding: "24px 22px 20px",
          }}>
            {/* Product name + stock */}
            <div style={{ paddingRight: 32 }}>
              <h5 className="fw-bold mb-2" style={{ lineHeight: 1.35 }}>{product.name}</h5>
              <StockBadge qty={product.quantity} />
            </div>

            {product.description && (
              <p className="text-muted fs-13 mt-3 mb-0" style={{ lineHeight: 1.7 }}>
                {product.description}
              </p>
            )}

            <hr className="my-3" style={{ borderColor: "var(--vz-border-color)" }} />

            {/* ── Redeem method ── */}
            <div className="mb-4">
              <label className="form-label fw-semibold fs-13 mb-2">
                Redeem Method <span className="text-danger">*</span>
              </label>
              <div className="d-flex gap-2">
                {/* WALLET */}
                {(["WALLET", "POINT"] as const).map((t) => {
                  const active   = redeemType === t;
                  const isWallet = t === "WALLET";
                  return (
                    <button key={t} type="button" disabled={redeeming}
                      onClick={() => setRedeemType(t)}
                      className="flex-grow-1"
                      style={{
                        padding: "12px 10px", borderRadius: 10, cursor: "pointer",
                        border: active
                          ? `2px solid ${isWallet ? "var(--vz-success)" : "var(--vz-warning)"}`
                          : "2px solid var(--vz-border-color)",
                        background: active
                          ? (isWallet ? "var(--vz-success-bg-subtle)" : "var(--vz-warning-bg-subtle)")
                          : "var(--vz-secondary-bg)",
                        transition: "all 0.15s", textAlign: "center",
                      }}>
                      <i className={`${isWallet ? "ri-wallet-3-line" : "ri-star-fill"} d-block mb-1`}
                        style={{ fontSize: 20, color: active ? (isWallet ? "var(--vz-success)" : "var(--vz-warning)") : "var(--vz-secondary-color)" }}>
                      </i>
                      <div className="fw-semibold" style={{ fontSize: 11, color: active ? (isWallet ? "var(--vz-success)" : "var(--vz-warning)") : "var(--vz-secondary-color)" }}>
                        {isWallet ? "Wallet" : "Points"}
                      </div>
                      <div className="fw-bold" style={{ fontSize: 13.5, color: active ? (isWallet ? "var(--vz-success)" : "var(--vz-warning)") : "var(--vz-body-color)" }}>
                        {isWallet ? `RM ${Number(product.priceWallet).toFixed(2)}` : `${product.pricePoints} pts`}
                      </div>
                    </button>
                  );
                })}

                {/* BANK */}
                <button type="button" disabled={redeeming}
                  onClick={() => setRedeemType("BANK_TRANSFER")}
                  className="flex-grow-1"
                  style={{
                    padding: "12px 10px", borderRadius: 10, cursor: "pointer",
                    border: redeemType === "BANK_TRANSFER" ? "2px solid var(--vz-primary)" : "2px solid var(--vz-border-color)",
                    background: redeemType === "BANK_TRANSFER" ? "var(--vz-primary-bg-subtle)" : "var(--vz-secondary-bg)",
                    transition: "all 0.15s", textAlign: "center",
                  }}>
                  <i className="ri-bank-line d-block mb-1"
                    style={{ fontSize: 20, color: redeemType === "BANK_TRANSFER" ? "var(--vz-primary)" : "var(--vz-secondary-color)" }}>
                  </i>
                  <div className="fw-semibold" style={{ fontSize: 11, color: redeemType === "BANK_TRANSFER" ? "var(--vz-primary)" : "var(--vz-secondary-color)" }}>
                    Banking
                  </div>
                  <div className="fw-bold" style={{ fontSize: 13.5, color: redeemType === "BANK_TRANSFER" ? "var(--vz-primary)" : "var(--vz-body-color)" }}>
                    RM {Number(product.priceWallet).toFixed(2)}
                  </div>
                </button>
              </div>

              {/* Deduction preview */}
              <div className={`rounded-3 p-2 mt-2 d-flex align-items-center justify-content-between ${
                redeemType === "WALLET" ? "bg-success-subtle border border-success border-opacity-25"
                : redeemType === "POINT" ? "bg-warning-subtle border border-warning border-opacity-25"
                : "bg-primary-subtle border border-primary border-opacity-25"}`}>
                <span className={`fs-12 ${redeemType === "WALLET" ? "text-success" : redeemType === "POINT" ? "text-warning" : "text-primary"}`}>
                  {redeemType === "WALLET"
                    ? <><i className="ri-wallet-3-line me-1"></i>Deducted from wallet</>
                    : redeemType === "POINT"
                    ? <><i className="ri-star-fill me-1"></i>Deducted from points</>
                    : <><i className="ri-bank-line me-1"></i>Pay via online banking</>}
                </span>
                <span className={`fw-bold fs-14 ${redeemType === "WALLET" ? "text-success" : redeemType === "POINT" ? "text-warning" : "text-primary"}`}>
                  {redeemType === "WALLET"
                    ? `RM ${Number(product.priceWallet).toFixed(2)}`
                    : redeemType === "POINT"
                    ? `${product.pricePoints} pts`
                    : `RM ${Number(product.priceWallet).toFixed(2)}`}
                </span>
              </div>

              {/* ── Bank transfer details (shown when BANK selected) ── */}
              {redeemType === "BANK_TRANSFER" && (
                <div className="mt-3 rounded-3 p-3"
                  style={{ border: "1.5px solid var(--vz-primary-border-subtle)", background: "var(--vz-primary-bg-subtle)" }}>
                  {loadingBank ? (
                    <div className="text-center py-2">
                      <Spinner size="sm" color="primary" /><span className="ms-2 fs-13 text-muted">Loading bank details…</span>
                    </div>
                  ) : bankSettings ? (
                    <>
                      {/* Bank info row */}
                      <p className="fs-11 text-uppercase fw-semibold text-muted mb-2">Transfer to</p>
                      <div className="rounded-3 p-3 mb-3"
                        style={{ background: "#fff", border: "1px solid var(--vz-border-color)" }}>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <i className="ri-bank-fill text-primary fs-15"></i>
                          <span className="fw-bold fs-14">{bankSettings.bankName}</span>
                        </div>
                        <div className="fs-13 text-muted mb-1">{bankSettings.accountName}</div>
                        <div className="fw-bold fs-15 font-monospace text-primary">{bankSettings.accountNumber}</div>
                      </div>

                      {/* Large QR code */}
                      {bankSettings.qrCodeUrl && (
                        <div className="text-center mb-1">
                          <p className="fs-11 text-uppercase fw-semibold text-muted mb-2">
                            <i className="ri-qr-code-line me-1"></i>Scan QR to Pay
                          </p>
                          <div className="d-inline-flex align-items-center justify-content-center rounded-3 p-2"
                            style={{ background: "#fff", border: "2px solid var(--vz-primary-border-subtle)" }}>
                            <img src={bankSettings.qrCodeUrl} alt="Payment QR"
                              style={{ width: 180, height: 180, objectFit: "contain", display: "block" }}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          </div>
                          <p className="text-muted fs-11 mt-2 mb-0">
                            Open your bank app and scan this QR code to transfer payment
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted fs-13 mb-0 text-center">
                      <i className="ri-information-line me-1"></i>Bank details unavailable
                    </p>
                  )}

                  {/* Receipt upload */}
                  <hr className="my-3" style={{ borderColor: "var(--vz-primary-border-subtle)" }} />
                  <p className="fs-12 fw-semibold mb-2 text-danger">
                    <i className="ri-upload-2-line me-1"></i>Upload Payment Receipt <span className="fw-normal">*</span>
                  </p>
                  <input
                    ref={receiptInputRef}
                    type="file"
                    accept="image/*"
                    className="d-none"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleReceiptSelect(file);
                      e.target.value = "";
                    }}
                  />
                  {receiptPreview ? (
                    <div className="d-flex align-items-center gap-2">
                      <img src={receiptPreview} alt="Receipt preview"
                        style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid var(--vz-border-color)", flexShrink: 0 }}
                      />
                      <div className="flex-grow-1 min-w-0">
                        <p className="mb-1 fs-12 fw-semibold text-truncate">{receiptFile?.name}</p>
                        <button type="button" className="btn btn-sm btn-soft-primary rounded-3 py-0 px-2 fs-11"
                          onClick={() => receiptInputRef.current?.click()}>
                          Change
                        </button>
                        <button type="button" className="btn btn-sm btn-soft-danger rounded-3 py-0 px-2 fs-11 ms-1"
                          onClick={() => { if (receiptPreview) URL.revokeObjectURL(receiptPreview); setReceiptFile(null); setReceiptPreview(null); }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-sm btn-outline-primary rounded-3 w-100"
                      onClick={() => receiptInputRef.current?.click()}>
                      <i className="ri-image-add-line me-1"></i>Attach Receipt Image
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Delivery address ── */}
            <div className="mb-3">
              <label className="form-label fw-semibold fs-13 mb-2">
                <i className="ri-map-pin-line me-1 text-primary"></i>
                Delivery Address <span className="text-danger">*</span>
              </label>

              {loadingAddr ? (
                <div className="text-center py-3">
                  <Spinner size="sm" color="primary" />
                  <span className="ms-2 text-muted fs-13">Loading addresses…</span>
                </div>
              ) : (
                <>
                  {/* Address list */}
                  {addresses.length > 0 && (
                    <div className="d-flex flex-column gap-2 mb-2">
                      {addresses.map((addr) => {
                        const selected = selectedAddr === addr.id;
                        return (
                          <div key={addr.id}
                            onClick={() => setSelectedAddr(addr.id)}
                            style={{
                              padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                              border: selected ? "2px solid var(--vz-primary)" : "1.5px solid var(--vz-border-color)",
                              background: selected ? "var(--vz-primary-bg-subtle)" : "var(--vz-secondary-bg)",
                              transition: "all 0.15s",
                            }}>
                            <div className="d-flex align-items-start gap-2">
                              <input type="radio" className="form-check-input mt-1 flex-shrink-0"
                                checked={selected} readOnly />
                              <div className="flex-grow-1 min-w-0">
                                <div className="fw-semibold fs-13">{addr.receiverName}</div>
                                <div className="text-muted fs-12">{addr.phone}</div>
                                <div className="text-muted fs-12">
                                  {[addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.postcode, addr.country]
                                    .filter(Boolean).join(", ")}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Empty state */}
                  {addresses.length === 0 && !showAddForm && (
                    <div className="text-center py-3 rounded-3"
                      style={{ border: "1.5px dashed var(--vz-border-color)", background: "var(--vz-secondary-bg)" }}>
                      <i className="ri-map-pin-line d-block mb-2 text-muted" style={{ fontSize: 28, opacity: 0.5 }}></i>
                      <p className="text-muted fs-13 mb-2">No saved addresses yet.</p>
                      <Button size="sm" color="primary" outline className="rounded-3"
                        onClick={() => setShowAddForm(true)}>
                        <i className="ri-add-line me-1"></i>Add Address
                      </Button>
                    </div>
                  )}

                  {/* Add new address link */}
                  {addresses.length > 0 && !showAddForm && (
                    <button type="button"
                      className="btn btn-sm btn-soft-primary w-100 rounded-3"
                      onClick={() => setShowAddForm(true)}>
                      <i className="ri-add-line me-1"></i>Add New Address
                    </button>
                  )}

                  {/* Inline add address form */}
                  {showAddForm && (
                    <div className="rounded-3 p-3 mt-1"
                      style={{ border: "1.5px solid var(--vz-border-color)", background: "var(--vz-secondary-bg)" }}>
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <h6 className="fw-semibold mb-0 fs-13">
                          <i className="ri-map-pin-add-line me-1 text-primary"></i>New Address
                        </h6>
                        {addresses.length > 0 && (
                          <button type="button" className="btn-close btn-sm"
                            onClick={() => { setShowAddForm(false); setAddrForm(EMPTY_ADDR); }} />
                        )}
                      </div>

                      <Row className="g-2">
                        <Col xs={12}>
                          <FormGroup className="mb-0">
                            <Label className="fs-12 mb-1">Receiver Name <span className="text-danger">*</span></Label>
                            <Input bsSize="sm" value={addrForm.receiverName} onChange={patchAddr("receiverName")} placeholder="Full name" />
                          </FormGroup>
                        </Col>
                        <Col xs={12}>
                          <FormGroup className="mb-0">
                            <Label className="fs-12 mb-1">Phone <span className="text-danger">*</span></Label>
                            <Input bsSize="sm" value={addrForm.phone} onChange={patchAddr("phone")} placeholder="01x-xxxxxxx" />
                          </FormGroup>
                        </Col>
                        <Col xs={12}>
                          <FormGroup className="mb-0">
                            <Label className="fs-12 mb-1">Address Line 1 <span className="text-danger">*</span></Label>
                            <Input bsSize="sm" value={addrForm.addressLine1} onChange={patchAddr("addressLine1")} placeholder="Street / block / house no." />
                          </FormGroup>
                        </Col>
                        <Col xs={12}>
                          <FormGroup className="mb-0">
                            <Label className="fs-12 mb-1">Address Line 2</Label>
                            <Input bsSize="sm" value={addrForm.addressLine2} onChange={patchAddr("addressLine2")} placeholder="Apartment, unit (optional)" />
                          </FormGroup>
                        </Col>
                        <Col xs={6}>
                          <FormGroup className="mb-0">
                            <Label className="fs-12 mb-1">City <span className="text-danger">*</span></Label>
                            <Input bsSize="sm" value={addrForm.city} onChange={patchAddr("city")} placeholder="City" />
                          </FormGroup>
                        </Col>
                        <Col xs={6}>
                          <FormGroup className="mb-0">
                            <Label className="fs-12 mb-1">State <span className="text-danger">*</span></Label>
                            <Input bsSize="sm" value={addrForm.state} onChange={patchAddr("state")} placeholder="State" />
                          </FormGroup>
                        </Col>
                        <Col xs={6}>
                          <FormGroup className="mb-0">
                            <Label className="fs-12 mb-1">Postcode <span className="text-danger">*</span></Label>
                            <Input bsSize="sm" value={addrForm.postcode} onChange={patchAddr("postcode")} placeholder="50000" />
                          </FormGroup>
                        </Col>
                        <Col xs={6}>
                          <FormGroup className="mb-0">
                            <Label className="fs-12 mb-1">Country <span className="text-danger">*</span></Label>
                            <Input bsSize="sm" value={addrForm.country} onChange={patchAddr("country")} placeholder="Malaysia" />
                          </FormGroup>
                        </Col>
                      </Row>

                      <div className="d-flex gap-2 mt-3">
                        <Button size="sm" color="primary" className="flex-grow-1 rounded-3"
                          disabled={savingAddr} onClick={handleSaveAddr}>
                          {savingAddr
                            ? <><Spinner size="sm" className="me-1" />Saving…</>
                            : <><i className="ri-save-line me-1"></i>Save Address</>}
                        </Button>
                        {addresses.length > 0 && (
                          <Button size="sm" color="light" className="rounded-3"
                            onClick={() => { setShowAddForm(false); setAddrForm(EMPTY_ADDR); }}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Note ── */}
            <div className="rounded-3 p-3 mt-auto"
              style={{ background: "var(--vz-info-bg-subtle)", border: "1px solid var(--vz-info-border-subtle)" }}>
              <p className="mb-1 fw-semibold fs-12 text-info">
                <i className="ri-information-line me-1"></i>Note
              </p>
              <ul className="mb-0 ps-3" style={{ fontSize: 11.5, color: "var(--vz-secondary-color)", lineHeight: 1.6 }}>
                <li>Points redemption deducts points immediately.</li>
                <li>Wallet redemption deducts wallet balance immediately.</li>
                <li>Online banking orders are pending until payment is verified.</li>
                <li>Redemption is final and cannot be refunded.</li>
              </ul>
            </div>
          </div>
        </div>
      </ModalBody>

      {/* Footer */}
      <ModalFooter className="gap-2" style={{ borderColor: "var(--vz-border-color)" }}>
        <Button color="light" onClick={onClose} disabled={redeeming}
          className="rounded-3" style={{ paddingInline: 20 }}>
          Cancel
        </Button>
        <Button color="primary" onClick={handleConfirm}
          disabled={redeeming || product.quantity === 0 || !selectedAddr || loadingAddr || (redeemType === "BANK_TRANSFER" && !receiptFile)}
          className="rounded-3" style={{ paddingInline: 28 }}>
          {redeeming
            ? <><Spinner size="sm" className="me-2" />Processing…</>
            : <><i className="ri-check-line me-1"></i>Confirm Redeem</>}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────

const Products = () => {
  const [products, setProducts]           = useState<Product[]>([]);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [view, setView]                       = useState<ViewMode>("grid");
  const [search, setSearch]                   = useState("");
  const [confirmOpen, setConfirmOpen]         = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [redeeming, setRedeeming]             = useState(false);

  const pageSize = view === "grid" ? PAGE_SIZE_GRID : PAGE_SIZE_LIST;

  const loadProducts = useCallback(async (p: number, ps: number) => {
    setLoading(true);
    try {
      const res = await getNormalProducts(p, ps);
      if (res.code === 200) {
        setProducts(res.data?.content ?? []);
        setTotalPages(res.data?.totalPages ?? 0);
        setTotalElements(res.data?.totalElements ?? 0);
      } else {
        setProducts([]);
        showToast.error(res.msg || "Failed to load products");
      }
    } catch {
      setProducts([]);
      showToast.error("Network error — could not load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(0, pageSize); setPage(0); }, [loadProducts, pageSize]);

  const openConfirm = (product: Product) => {
    setSelectedProduct(product);
    setConfirmOpen(true);
  };

  const handleRedeem = async (redeemType: "POINT" | "WALLET" | "BANK_TRANSFER", addressId: number, receiptFile?: File) => {
    if (!selectedProduct) return;
    setRedeeming(true);
    try {
      let res;
      if (redeemType === "BANK_TRANSFER") {
        // Receipt is required and sent together with the redeem request
        res = await redeemProductBankTransfer(selectedProduct.id, addressId, receiptFile!);
      } else {
        res = await redeemProduct(selectedProduct.id, redeemType, addressId);
      }
      if (res.code === 200) {
        showToast.success(
          redeemType === "BANK_TRANSFER"
            ? "Order placed! Your receipt has been submitted for verification."
            : "Redeemed successfully!"
        );
        setConfirmOpen(false);
        loadProducts(page, pageSize);
      } else {
        showToast.error(res.msg || "Redemption failed");
      }
    } catch {
      showToast.error("Network error");
    } finally {
      setRedeeming(false);
    }
  };

  const handlePageChange = (p: number) => { setPage(p); loadProducts(p, pageSize); };

  const pageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const start = Math.max(0, Math.min(page - 2, totalPages - 5));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  };

  const filtered = search.trim()
    ? products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description ?? "").toLowerCase().includes(search.toLowerCase()))
    : products;

  document.title = "Products | Dashboard";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>

          {/* Breadcrumb */}
          <Row>
            <Col xs={12}>
              <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                <h4 className="mb-sm-0">Products</h4>
                <ol className="breadcrumb m-0">
                  <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
                  <li className="breadcrumb-item active">Products</li>
                </ol>
              </div>
            </Col>
          </Row>

          {/* ── Toolbar ───────────────────────────────────────────────────────── */}
          <Card className="border-0 shadow-sm mb-3">
            <CardHeader className="border-bottom-0 bg-transparent py-3">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div className="flex-grow-1" style={{ minWidth: 200, maxWidth: 400 }}>
                  <InputGroup>
                    <span className="input-group-text bg-white border-end-0" style={{ borderRadius: "8px 0 0 8px" }}>
                      <i className="ri-search-line text-muted"></i>
                    </span>
                    <Input type="text" placeholder="Search products…"
                      value={search} onChange={(e) => setSearch(e.target.value)}
                      className="border-start-0 ps-0"
                      style={{ borderRadius: "0 8px 8px 0" }} />
                  </InputGroup>
                </div>

                {!loading && totalElements > 0 && (
                  <p className="mb-0 text-muted fs-13 flex-grow-1">
                    <i className="ri-store-2-line me-1 text-primary"></i>
                    <span className="fw-semibold text-body">{filtered.length}</span>
                    {search
                      ? ` result${filtered.length !== 1 ? "s" : ""} for "${search}"`
                      : ` of ${totalElements} products`}
                  </p>
                )}

                {/* View toggle */}
                <div className="d-flex gap-1">
                  <button type="button" title="Grid view" onClick={() => setView("grid")}
                    className={`btn btn-sm ${view === "grid" ? "btn-primary" : "btn-soft-secondary"}`}
                    style={{ borderRadius: 8, width: 36, height: 36, padding: 0 }}>
                    <i className="ri-grid-fill" style={{ fontSize: 15 }}></i>
                  </button>
                  <button type="button" title="List view" onClick={() => setView("list")}
                    className={`btn btn-sm ${view === "list" ? "btn-primary" : "btn-soft-secondary"}`}
                    style={{ borderRadius: 8, width: 36, height: 36, padding: 0 }}>
                    <i className="ri-list-unordered" style={{ fontSize: 15 }}></i>
                  </button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* ── Products ──────────────────────────────────────────────────────── */}
          {loading ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
              <p className="text-muted mt-2 mb-0 fs-14">Loading products…</p>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardBody className="text-center py-5 text-muted">
                <i className="ri-store-2-line d-block mb-3 opacity-25" style={{ fontSize: 56 }}></i>
                <p className="fs-15 fw-medium mb-2">
                  {search ? "No products match your search." : "No products available."}
                </p>
                {search && (
                  <button className="btn btn-sm btn-soft-secondary rounded-3 mt-1"
                    onClick={() => setSearch("")}>
                    Clear search
                  </button>
                )}
              </CardBody>
            </Card>
          ) : view === "grid" ? (
            <Row className="g-4">
              {filtered.map((product) => (
                <Col key={product.id} xxl={4} xl={4} md={6} xs={12}>
                  <GridCard product={product} onOpen={openConfirm} />
                </Col>
              ))}
            </Row>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filtered.map((product) => (
                <ListRow key={product.id} product={product} onOpen={openConfirm} />
              ))}
            </div>
          )}

          {/* ── Pagination ────────────────────────────────────────────────────── */}
          {!loading && totalPages > 1 && (
            <Row className="align-items-center mt-4 g-3">
              <div className="col-sm">
                <p className="text-muted mb-0 fs-13">
                  Page <span className="fw-semibold">{page + 1}</span>
                  {" "}of <span className="fw-semibold">{totalPages}</span>
                  {" "}· <span className="fw-semibold">{totalElements}</span> total
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

        </Container>
      </div>

      {selectedProduct && (
        <RedeemModal
          product={selectedProduct}
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleRedeem}
          redeeming={redeeming}
        />
      )}
    </React.Fragment>
  );
};

export default Products;
