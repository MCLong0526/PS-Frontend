import React, { useState, useEffect, useCallback } from "react";
import {
  Container, Row, Col, Card, CardBody,
  Button, Spinner, Modal, ModalHeader, ModalBody, ModalFooter,
  Badge,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import {
  getLuckyDrawProducts, getProductById, joinLuckyDraw, getUserLuckyDrawItems,
  Product, UserLuckyDrawItem,
} from "../../helpers/productApi";
import { showToast } from "../../helpers/appToast";

// ── Helpers ───────────────────────────────────────────────────────────────────

const NoImageBox = ({ size = 48 }: { size?: number }) => (
  <div className="d-flex align-items-center justify-content-center w-100 h-100">
    <i className="ri-image-line text-muted" style={{ fontSize: size, opacity: 0.25 }} />
  </div>
);

const ProductImg = ({ src, alt, height = 200 }: { src?: string; alt: string; height?: number }) => (
  <div
    style={{
      height,
      background: "#f8f9fa",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {src ? (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: 16 }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    ) : (
      <NoImageBox size={52} />
    )}
  </div>
);

/** Rarity label based on weight value */
const rarityFor = (weight: number): { label: string; color: string; bg: string } => {
  if (weight >= 50) return { label: "Common",    color: "#52c41a", bg: "#f6ffed" };
  if (weight >= 20) return { label: "Rare",       color: "#1677ff", bg: "#e6f4ff" };
  return              { label: "Legendary",  color: "#9254de", bg: "#f9f0ff" };
};

// ── Rewards Preview Modal ─────────────────────────────────────────────────────

interface RewardsModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onDraw: () => void;
  anyDrawing: boolean;
}

const RewardsModal: React.FC<RewardsModalProps> = ({ product, open, onClose, onDraw, anyDrawing }) => {
  const [items, setItems]       = useState<UserLuckyDrawItem[]>([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    setItems([]);
    setLoading(true);
    getUserLuckyDrawItems(product.id)
      .then((res) => {
        if (res.code === 200 && Array.isArray(res.data)) {
          setItems(res.data);
        } else {
          showToast.error(res.msg || "Failed to load rewards.");
        }
      })
      .catch(() => showToast.error("Network error."))
      .finally(() => setLoading(false));
  }, [open, product]);

  if (!product) return null;

  return (
    <Modal isOpen={open} toggle={onClose} centered size="lg" scrollable>
      <ModalHeader toggle={onClose}>
        <i className="ri-gift-2-fill text-warning me-2" />
        Possible Rewards — {product.name}
      </ModalHeader>

      <ModalBody>
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="warning" />
            <p className="text-muted mt-2" style={{ fontSize: 13 }}>Loading rewards…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="ri-inbox-line d-block mb-2" style={{ fontSize: 40, opacity: 0.3 }} />
            No reward items configured yet.
          </div>
        ) : (
          <>
            <p className="text-muted mb-3" style={{ fontSize: 13 }}>
              These are the possible prizes you could win. The backend randomly selects your reward.
            </p>
            <Row className="g-3">
              {items.map((item) => {
                const { label, color, bg } = rarityFor(item.weight);
                return (
                  <Col key={item.id} xs={6} sm={4} md={3}>
                    <div
                      className="text-center h-100"
                      style={{
                        borderRadius: 10,
                        border: "1px solid var(--vz-border-color)",
                        overflow: "hidden",
                        background: "#fff",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {/* Image */}
                      <div
                        style={{
                          height: 100,
                          background: "#f8f9fa",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: 8 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <i className="ri-image-line text-muted" style={{ fontSize: 32, opacity: 0.25 }} />
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2 flex-grow-1 d-flex flex-column justify-content-between">
                        <div
                          className="fw-medium mb-1"
                          style={{
                            fontSize: 12,
                            lineHeight: 1.3,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {item.name}
                        </div>
                        {/* Rarity badge */}
                        <span
                          className="badge mt-1"
                          style={{ fontSize: 10, color, background: bg, border: `1px solid ${color}33` }}
                        >
                          {label}
                        </span>
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </>
        )}
      </ModalBody>

      <ModalFooter className="gap-2">
        <Button color="light" onClick={onClose}>Close</Button>
        <Button
          color="warning"
          onClick={() => { onClose(); onDraw(); }}
          disabled={anyDrawing || product.quantity <= 0}
        >
          <i className="ri-gift-2-fill me-1" />
          Draw Now
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// ── Payment Method Modal ──────────────────────────────────────────────────────

interface PaymentModalProps {
  product: Product;
  open: boolean;
  drawing: boolean;
  onClose: () => void;
  onConfirm: (type: "POINT" | "WALLET") => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ product, open, drawing, onClose, onConfirm }) => {
  const [paymentType, setPaymentType] = useState<"POINT" | "WALLET">("POINT");
  const img = product.images?.[0]?.imageUrl;

  return (
    <Modal isOpen={open} toggle={() => !drawing && onClose()} centered>
      <ModalHeader toggle={() => !drawing && onClose()}>Choose Payment Method</ModalHeader>
      <ModalBody>
        {/* Product preview */}
        <div className="text-center mb-3">
          <div
            style={{
              height: 120,
              background: "#f8f9fa",
              borderRadius: 8,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            {img ? (
              <img
                src={img}
                alt={product.name}
                style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", padding: 12 }}
              />
            ) : (
              <NoImageBox size={40} />
            )}
          </div>
          <div className="fw-semibold">{product.name}</div>
        </div>

        <p className="text-muted text-center mb-3" style={{ fontSize: 13 }}>
          Select how you'd like to pay for this lucky draw entry.
        </p>

        {/* Payment options */}
        <div className="d-flex gap-3">
          <div
            className="flex-grow-1 text-center p-3 rounded-3"
            onClick={() => !drawing && setPaymentType("POINT")}
            style={{
              cursor: drawing ? "not-allowed" : "pointer",
              border: paymentType === "POINT" ? "2px solid var(--vz-warning)" : "2px solid var(--vz-border-color)",
              background: paymentType === "POINT" ? "var(--vz-warning-bg-subtle)" : "transparent",
              transition: "all 0.2s",
            }}
          >
            <i className="ri-star-fill text-warning" style={{ fontSize: 24 }} />
            <div className="fw-bold text-warning mt-1" style={{ fontSize: 15 }}>{product.pricePoints} pts</div>
            <div className="text-muted" style={{ fontSize: 11 }}>Points</div>
          </div>

          <div
            className="flex-grow-1 text-center p-3 rounded-3"
            onClick={() => !drawing && setPaymentType("WALLET")}
            style={{
              cursor: drawing ? "not-allowed" : "pointer",
              border: paymentType === "WALLET" ? "2px solid var(--vz-success)" : "2px solid var(--vz-border-color)",
              background: paymentType === "WALLET" ? "var(--vz-success-bg-subtle)" : "transparent",
              transition: "all 0.2s",
            }}
          >
            <i className="ri-wallet-3-fill text-success" style={{ fontSize: 24 }} />
            <div className="fw-bold text-success mt-1" style={{ fontSize: 15 }}>RM {Number(product.priceWallet).toFixed(2)}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>Wallet</div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="gap-2">
        <Button color="light" onClick={onClose} disabled={drawing}>Cancel</Button>
        <Button color="warning" onClick={() => onConfirm(paymentType)} disabled={drawing}>
          {drawing ? (
            <><Spinner size="sm" className="me-2" />Drawing…</>
          ) : (
            <><i className="ri-gift-2-fill me-1" />Draw Now</>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// ── Result Modal ──────────────────────────────────────────────────────────────

interface ResultModalProps {
  reward: Product | null;
  open: boolean;
  onClose: () => void;
}

const ResultModal: React.FC<ResultModalProps> = ({ reward, open, onClose }) => {
  const img = reward?.images?.[0]?.imageUrl;

  return (
    <Modal isOpen={open} toggle={onClose} centered>
      <ModalBody className="text-center p-4">
        <div
          style={{
            fontSize: 56,
            lineHeight: 1,
            marginBottom: 12,
            animation: open ? "luckyDrawBounce 0.6s ease" : undefined,
          }}
        >
          🎉
        </div>
        <h4 className="fw-bold mb-1">Congratulations!</h4>
        <p className="text-muted mb-3" style={{ fontSize: 13 }}>You won the following reward:</p>

        {reward && (
          <>
            <div
              style={{
                height: 160,
                background: "var(--vz-secondary-bg)",
                borderRadius: 12,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              {img ? (
                <img
                  src={img}
                  alt={reward.name}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: 16 }}
                />
              ) : (
                <NoImageBox size={48} />
              )}
            </div>

            <Badge color="warning" className="mb-2 px-3 py-2" style={{ fontSize: 11, borderRadius: 20 }}>
              Lucky Draw Reward
            </Badge>
            <h5 className="fw-bold mb-1">{reward.name}</h5>
            {reward.description && (
              <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{reward.description}</p>
            )}
          </>
        )}
      </ModalBody>
      <ModalFooter className="justify-content-center border-0 pt-0">
        <Button color="warning" onClick={onClose} className="px-4">
          <i className="ri-check-line me-1" />Awesome!
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// ── Draw Card ─────────────────────────────────────────────────────────────────

interface DrawCardProps {
  product: Product;
  onViewRewards: (product: Product) => void;
  onDraw: (product: Product) => void;
  disabled: boolean;
}

const DrawCard: React.FC<DrawCardProps> = ({ product, onViewRewards, onDraw, disabled }) => {
  const img     = product.images?.[0]?.imageUrl;
  const inStock = product.quantity > 0;

  return (
    <Card
      className="border-0 h-100 mb-0"
      style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
    >
      {/* Image */}
      <div style={{ position: "relative" }}>
        <ProductImg src={img} alt={product.name} height={190} />

        {/* Stock badge */}
        <div className="position-absolute" style={{ top: 10, left: 10 }}>
          {inStock ? (
            <span className="badge bg-success rounded-pill" style={{ fontSize: 10.5 }}>
              {product.quantity} left
            </span>
          ) : (
            <span className="badge bg-danger rounded-pill" style={{ fontSize: 10.5 }}>Out of Stock</span>
          )}
        </div>

        {/* Lucky Draw badge */}
        <div className="position-absolute" style={{ top: 10, right: 10 }}>
          <span
            className="badge rounded-pill"
            style={{ fontSize: 10, background: "linear-gradient(135deg, #f7b84b, #f06548)", color: "#fff" }}
          >
            <i className="ri-gift-2-fill me-1" style={{ fontSize: 9 }} />Lucky Draw
          </span>
        </div>
      </div>

      <CardBody className="d-flex flex-column p-3">
        <h6 className="fw-semibold mb-1" style={{ fontSize: 14 }}>{product.name}</h6>

        {product.description && (
          <p
            className="text-muted mb-2"
            style={{
              fontSize: 12,
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.description}
          </p>
        )}

        {/* Pricing */}
        <div className="d-flex gap-2 mb-3 mt-auto">
          <div
            className="flex-grow-1 text-center p-2 rounded-3"
            style={{ background: "var(--vz-warning-bg-subtle)", border: "1px solid var(--vz-warning-border-subtle)" }}
          >
            <div className="fs-10 text-uppercase fw-semibold mb-1" style={{ color: "#888", letterSpacing: 0.4 }}>Points</div>
            <div className="fw-bold text-warning" style={{ fontSize: 13 }}>
              <i className="ri-star-fill me-1" style={{ fontSize: 10 }} />{product.pricePoints}
            </div>
          </div>
          <div
            className="flex-grow-1 text-center p-2 rounded-3"
            style={{ background: "var(--vz-success-bg-subtle)", border: "1px solid var(--vz-success-border-subtle)" }}
          >
            <div className="fs-10 text-uppercase fw-semibold mb-1" style={{ color: "#888", letterSpacing: 0.4 }}>Wallet</div>
            <div className="fw-bold text-success" style={{ fontSize: 13 }}>RM {Number(product.priceWallet).toFixed(2)}</div>
          </div>
        </div>

        {/* Buttons */}
        <div className="d-flex gap-2">
          <Button
            color="light"
            className="flex-grow-1 fw-medium"
            style={{ borderRadius: 8, fontSize: 13 }}
            onClick={() => onViewRewards(product)}
            disabled={disabled}
          >
            <i className="ri-eye-line me-1" />View Rewards
          </Button>
          <Button
            color="warning"
            className="flex-grow-1 fw-semibold"
            style={{ borderRadius: 8, fontSize: 13 }}
            disabled={disabled || !inStock}
            onClick={() => onDraw(product)}
          >
            {!inStock ? "Out of Stock" : <><i className="ri-gift-2-fill me-1" />Draw Now</>}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const LuckyDraw: React.FC = () => {
  const [products, setProducts]               = useState<Product[]>([]);
  const [loading, setLoading]                 = useState(true);

  // Rewards preview
  const [rewardsProduct, setRewardsProduct]   = useState<Product | null>(null);
  const [rewardsModalOpen, setRewardsModalOpen] = useState(false);

  // Payment / draw
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [drawing, setDrawing]                 = useState(false);

  // Result
  const [rewardProduct, setRewardProduct]     = useState<Product | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLuckyDrawProducts(0, 50);
      if (res.code === 200 && res.data?.content) {
        setProducts(res.data.content);
      } else {
        showToast.error(res.msg || "Failed to load lucky draw products.");
      }
    } catch {
      showToast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── View Rewards ──────────────────────────────────────────────────────────────

  const handleViewRewards = (product: Product) => {
    setRewardsProduct(product);
    setRewardsModalOpen(true);
  };

  // ── Draw ──────────────────────────────────────────────────────────────────────

  const handleOpenDraw = (product: Product) => {
    setSelectedProduct(product);
    setPaymentModalOpen(true);
  };

  const handleDraw = async (redeemType: "POINT" | "WALLET") => {
    if (!selectedProduct) return;
    setDrawing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const res = await joinLuckyDraw(selectedProduct.id, redeemType);

      if (res.code === 200 && res.data?.productId) {
        const rewardRes = await getProductById(res.data.productId);
        setPaymentModalOpen(false);
        setRewardProduct(rewardRes.code === 200 ? rewardRes.data : null);
        setResultModalOpen(true);
        fetchProducts();
      } else {
        showToast.error(res.msg || "Lucky draw failed. Please try again.");
      }
    } catch {
      showToast.error("Network error. Please try again.");
    } finally {
      setDrawing(false);
    }
  };

  const handleCloseResult = () => {
    setResultModalOpen(false);
    setRewardProduct(null);
    setSelectedProduct(null);
  };

  const handleClosePayment = () => {
    if (drawing) return;
    setPaymentModalOpen(false);
    setSelectedProduct(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Lucky Draw" pageTitle="Home" />

        {/* Header banner */}
        <div
          className="mb-4 p-4 rounded-3 text-center"
          style={{ background: "linear-gradient(135deg, #f7b84b 0%, #f06548 100%)", color: "#fff" }}
        >
          <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 8 }}>🎰</div>
          <h3 className="fw-bold mb-1" style={{ color: "#fff" }}>Lucky Draw</h3>
          <p className="mb-0 opacity-75" style={{ fontSize: 14 }}>
            Spend points or wallet balance to win a random reward!
          </p>
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="warning" />
            <p className="text-muted mt-2" style={{ fontSize: 13 }}>Loading lucky draw products…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-5">
            <i className="ri-gift-2-line text-muted" style={{ fontSize: 56, opacity: 0.3 }} />
            <p className="text-muted mt-3">No lucky draw products available right now.</p>
          </div>
        ) : (
          <Row className="g-3">
            {products.map((product) => (
              <Col key={product.id} xs={12} sm={6} lg={4} xl={3}>
                <DrawCard
                  product={product}
                  onViewRewards={handleViewRewards}
                  onDraw={handleOpenDraw}
                  disabled={drawing}
                />
              </Col>
            ))}
          </Row>
        )}
      </Container>

      {/* Rewards preview modal */}
      <RewardsModal
        product={rewardsProduct}
        open={rewardsModalOpen}
        onClose={() => setRewardsModalOpen(false)}
        onDraw={() => rewardsProduct && handleOpenDraw(rewardsProduct)}
        anyDrawing={drawing}
      />

      {/* Payment modal */}
      {selectedProduct && (
        <PaymentModal
          product={selectedProduct}
          open={paymentModalOpen}
          drawing={drawing}
          onClose={handleClosePayment}
          onConfirm={handleDraw}
        />
      )}

      {/* Result modal */}
      <ResultModal
        reward={rewardProduct}
        open={resultModalOpen}
        onClose={handleCloseResult}
      />

      <style>{`
        @keyframes luckyDrawBounce {
          0%   { transform: scale(0.4); opacity: 0; }
          60%  { transform: scale(1.2); opacity: 1; }
          80%  { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default LuckyDraw;
