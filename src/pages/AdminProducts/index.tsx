import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, Row, Col, Card, CardBody, CardHeader,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, Input, Label, Form, FormFeedback, Spinner,
} from "reactstrap";
import * as Yup from "yup";
import { useFormik } from "formik";
import {
  getProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
  adminUploadProductImage, adminDeleteProductImage,
  getLuckyDrawItems, addLuckyDrawItem, updateLuckyDrawItem, deleteLuckyDrawItem,
  Product, LuckyDrawItem,
} from "../../helpers/productApi";
import { showToast } from "../../helpers/appToast";

const PAGE_SIZE = 10;

interface GalleryImage {
  key: string;
  url: string;           // preview (object URL) or server URL
  file?: File;           // present in create-mode pending images
  uploading?: boolean;   // true while uploading or deleting
  imageId?: number;      // server image ID (for delete API)
}

// ── Image Section component ───────────────────────────────────────────────────

interface ImageSectionProps {
  images: GalleryImage[];
  onAddFiles: (files: File[]) => Promise<void>;
  onRemove?: (key: string) => void;
  uploading: boolean;
  isCreateMode: boolean;
}

const ImageSection: React.FC<ImageSectionProps> = ({
  images, onAddFiles, onRemove, uploading, isCreateMode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length > 0) await onAddFiles(files);
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <p className="fw-semibold mb-0 fs-14">
          <i className="ri-image-line me-2 text-primary"></i>Product Images
        </p>
        {images.length > 0 && (
          <span className="badge bg-primary-subtle text-primary">
            {images.length} image{images.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Drop zone ─────────────────────────────────────────────────────── */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? "#405189" : "#ced4da"}`,
          borderRadius: "10px",
          backgroundColor: dragOver ? "rgba(64, 81, 137, 0.06)" : "#f8f9fa",
          cursor: uploading ? "default" : "pointer",
          transition: "border-color 0.2s, background-color 0.2s",
          minHeight: 120,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          marginBottom: 16,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="d-none"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith("image/"));
            if (files.length) await onAddFiles(files);
            e.target.value = "";
          }}
        />

        {uploading ? (
          <>
            <Spinner color="primary" className="mb-2" />
            <p className="text-muted fs-13 mb-0">Uploading…</p>
          </>
        ) : (
          <>
            <i className={`ri-upload-cloud-2-line fs-1 mb-2 ${dragOver ? "text-primary" : "text-muted"}`}
               style={{ opacity: dragOver ? 1 : 0.5 }}></i>
            <p className={`fw-medium mb-1 ${dragOver ? "text-primary" : "text-body"}`}>
              {dragOver ? "Drop images here" : "Drag & drop images here"}
            </p>
            <p className="text-muted fs-12 mb-0">
              or <span className="text-primary fw-medium">click to browse</span> from your computer
            </p>
            <p className="text-muted fs-11 mb-0 mt-1">Supports JPG, PNG, WebP, GIF</p>
          </>
        )}
      </div>

      {/* ── Image gallery ─────────────────────────────────────────────────── */}
      {images.length > 0 && (
        <Row className="g-2">
          {images.map((img, idx) => (
            <Col xs={3} key={img.key}>
              <div
                className="position-relative rounded overflow-hidden border bg-light"
                style={{ paddingTop: "100%" }}
              >
                <img
                  src={img.url}
                  alt={`product-${idx}`}
                  className="position-absolute top-0 start-0 w-100 h-100"
                  style={{ objectFit: "contain", padding: 4, background: "#f8f9fa" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "";
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />

                {/* Uploading overlay */}
                {img.uploading && (
                  <div
                    className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: "rgba(255,255,255,0.7)" }}
                  >
                    <Spinner size="sm" color="primary" />
                  </div>
                )}

                {/* Main badge */}
                {idx === 0 && !img.uploading && (
                  <span
                    className="position-absolute top-0 start-0 badge bg-primary m-1"
                    style={{ fontSize: 9, lineHeight: 1.4 }}
                  >
                    Main
                  </span>
                )}

                {/* Remove button */}
                {onRemove && !img.uploading && (
                  <button
                    type="button"
                    onClick={() => onRemove(img.key)}
                    className="position-absolute top-0 end-0 m-1 btn btn-danger rounded-circle p-0 d-flex align-items-center justify-content-center"
                    style={{ width: 20, height: 20, fontSize: 11, lineHeight: 1 }}
                    title="Remove"
                  >
                    <i className="ri-close-line"></i>
                  </button>
                )}
              </div>
            </Col>
          ))}
        </Row>
      )}

      {images.length === 0 && !uploading && (
        <div className="text-center py-2 text-muted fs-13">
          <i className="ri-image-line d-block mb-1 fs-4 opacity-25"></i>
          No images added yet
        </div>
      )}

      {isCreateMode && (
        <p className="text-muted fs-11 mt-2 mb-0">
          <i className="ri-information-line me-1 text-info"></i>
          Images will be uploaded automatically after the product is created.
        </p>
      )}
    </div>
  );
};

// ── Reward Config types & component ──────────────────────────────────────────

interface PendingReward {
  tempKey: string;
  product: Product;
  weight: number;
}

interface RewardItem extends LuckyDrawItem {
  product?: Product;
  editingWeight: string | null;
  saving: boolean;
  deleting: boolean;
}

const RewardConfigSection: React.FC<{
  productId?: number;
  normalProducts: Product[];
  pendingRewards: PendingReward[];
  onPendingChange: (r: PendingReward[]) => void;
  validationError?: string;
}> = ({ productId, normalProducts, pendingRewards, onPendingChange, validationError }) => {
  const isCreateMode = !productId;

  const [items, setItems]               = useState<RewardItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [addSelId, setAddSelId]         = useState<string>("");
  const [addWeight, setAddWeight]       = useState<string>("");
  const [adding, setAdding]             = useState(false);

  // Load existing items in edit mode
  useEffect(() => {
    if (isCreateMode) return;
    setItemsLoading(true);
    getLuckyDrawItems(productId!).then((res) => {
      if (res.code === 200 && Array.isArray(res.data)) {
        setItems(res.data.map((item) => ({
          ...item,
          product: normalProducts.find((p) => p.id === item.rewardProductId),
          editingWeight: null,
          saving: false,
          deleting: false,
        })));
      }
    }).catch(() => {}).finally(() => setItemsLoading(false));
  }, [productId, isCreateMode, normalProducts]);

  // Products already used (prevent duplicates)
  const usedIds = new Set(
    isCreateMode
      ? pendingRewards.map((r) => r.product.id)
      : items.map((i) => i.rewardProductId)
  );
  const availableProducts = normalProducts.filter((p) => !usedIds.has(p.id));

  // ── Add handler ──────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    const selId = Number(addSelId);
    const weight = Number(addWeight);
    if (!selId || weight <= 0) return;
    const product = normalProducts.find((p) => p.id === selId);
    if (!product) return;

    if (isCreateMode) {
      onPendingChange([
        ...pendingRewards,
        { tempKey: `${Date.now()}-${Math.random()}`, product, weight },
      ]);
      setAddSelId(""); setAddWeight("");
    } else {
      setAdding(true);
      try {
        const res = await addLuckyDrawItem(productId!, selId, weight);
        if (res.code === 200) {
          setItems((prev) => [
            ...prev,
            {
              id: res.data?.id ?? Date.now(),
              rewardProductId: selId,
              weight,
              product,
              editingWeight: null,
              saving: false,
              deleting: false,
            },
          ]);
          setAddSelId(""); setAddWeight("");
          showToast.success("Reward added");
        } else {
          showToast.error(res.msg || "Failed to add reward");
        }
      } catch { showToast.error("Network error"); }
      finally { setAdding(false); }
    }
  };

  // ── Edit weight (edit mode) ───────────────────────────────────────────────────

  const startEdit  = (id: number) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, editingWeight: String(i.weight) } : i));

  const cancelEdit = (id: number) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, editingWeight: null } : i));

  const saveEdit = async (item: RewardItem) => {
    const weight = Number(item.editingWeight);
    if (!weight || weight <= 0) return;
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, saving: true } : i));
    try {
      const res = await updateLuckyDrawItem(item.id, weight);
      if (res.code === 200) {
        setItems((prev) => prev.map((i) =>
          i.id === item.id ? { ...i, weight, editingWeight: null, saving: false } : i
        ));
        showToast.success("Weight updated");
      } else {
        showToast.error(res.msg || "Failed to update");
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, saving: false } : i));
      }
    } catch {
      showToast.error("Network error");
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, saving: false } : i));
    }
  };

  // ── Delete (edit mode) ────────────────────────────────────────────────────────

  const handleDelete = async (id: number) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, deleting: true } : i));
    try {
      const res = await deleteLuckyDrawItem(id);
      if (res.code === 200) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        showToast.success("Reward removed");
      } else {
        showToast.error(res.msg || "Failed to delete");
        setItems((prev) => prev.map((i) => i.id === id ? { ...i, deleting: false } : i));
      }
    } catch {
      showToast.error("Network error");
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, deleting: false } : i));
    }
  };

  // ── Pending reward helpers (create mode) ─────────────────────────────────────

  const removePending = (key: string) =>
    onPendingChange(pendingRewards.filter((r) => r.tempKey !== key));

  const updatePendingWeight = (key: string, w: number) =>
    onPendingChange(pendingRewards.map((r) => r.tempKey === key ? { ...r, weight: w } : r));

  // ── Render ───────────────────────────────────────────────────────────────────

  const rows = isCreateMode
    ? pendingRewards.map((r) => ({ key: r.tempKey, product: r.product, weight: r.weight, serverItem: null as RewardItem | null }))
    : items.map((i)         => ({ key: String(i.id), product: i.product, weight: i.weight, serverItem: i }));

  const totalWeight = rows.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);

  return (
    <div>
      {/* Validation error */}
      {validationError && (
        <div className="alert alert-danger py-2 px-3 mb-3 d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
          <i className="ri-error-warning-fill flex-shrink-0" />
          {validationError}
        </div>
      )}

      {itemsLoading ? (
        <div className="text-center py-3"><Spinner size="sm" color="warning" /></div>
      ) : (
        <>
          {/* Reward table */}
          {rows.length > 0 ? (
            <>
              <div className="table-responsive mb-2">
                <table className="table table-sm table-bordered align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 48 }}></th>
                      <th>Product</th>
                      <th style={{ width: 150 }}>Weight</th>
                      <th style={{ width: 80 }}>Chance</th>
                      <th style={{ width: 96 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ key, product, weight, serverItem }) => {
                      const img     = product?.images?.[0]?.imageUrl;
                      const pct     = totalWeight > 0 ? ((Number(weight) / totalWeight) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={key}>
                          {/* Image */}
                          <td className="text-center">
                            {img ? (
                              <img src={img} alt="" style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 4 }} />
                            ) : (
                              <div className="d-flex align-items-center justify-content-center bg-light rounded mx-auto" style={{ width: 34, height: 34 }}>
                                <i className="ri-image-line text-muted" style={{ fontSize: 15 }} />
                              </div>
                            )}
                          </td>

                          {/* Name */}
                          <td>
                            <div className="fw-medium" style={{ fontSize: 13 }}>
                              {product?.name ?? `Product #${serverItem?.rewardProductId ?? ""}`}
                            </div>
                            {product && (
                              <div className="text-muted" style={{ fontSize: 11 }}>{product.quantity} in stock</div>
                            )}
                          </td>

                          {/* Weight */}
                          <td>
                            {isCreateMode ? (
                              <Input
                                type="number" min="1" bsSize="sm"
                                value={weight}
                                onChange={(e) => updatePendingWeight(key, Number(e.target.value))}
                                style={{ width: 80 }}
                              />
                            ) : serverItem?.editingWeight !== null ? (
                              <div className="d-flex gap-1 align-items-center">
                                <Input
                                  type="number" min="1" bsSize="sm"
                                  value={serverItem!.editingWeight ?? ""}
                                  onChange={(e) =>
                                    setItems((prev) => prev.map((i) =>
                                      i.id === serverItem!.id ? { ...i, editingWeight: e.target.value } : i
                                    ))
                                  }
                                  style={{ width: 70 }}
                                  disabled={serverItem!.saving}
                                />
                                <Button color="success" size="sm" onClick={() => saveEdit(serverItem!)} disabled={serverItem!.saving} style={{ padding: "2px 6px" }}>
                                  {serverItem!.saving ? <Spinner size="sm" /> : <i className="ri-check-line" />}
                                </Button>
                                <Button color="light" size="sm" onClick={() => cancelEdit(serverItem!.id)} disabled={serverItem!.saving} style={{ padding: "2px 6px" }}>
                                  <i className="ri-close-line" />
                                </Button>
                              </div>
                            ) : (
                              <span className="badge bg-warning-subtle text-warning fw-semibold px-2 py-1" style={{ fontSize: 12 }}>
                                {weight}
                              </span>
                            )}
                          </td>

                          {/* Chance % */}
                          <td>
                            <span className="badge bg-primary-subtle text-primary fw-semibold px-2 py-1" style={{ fontSize: 11 }}>
                              {pct}%
                            </span>
                          </td>

                          {/* Actions */}
                          <td>
                            {isCreateMode ? (
                              <Button color="danger" size="sm" outline onClick={() => removePending(key)} style={{ padding: "2px 8px" }}>
                                <i className="ri-delete-bin-line" />
                              </Button>
                            ) : (
                              <div className="d-flex gap-1">
                                {serverItem?.editingWeight === null && (
                                  <Button color="primary" size="sm" outline onClick={() => startEdit(serverItem!.id)} disabled={serverItem?.deleting} style={{ padding: "2px 6px" }}>
                                    <i className="ri-edit-line" />
                                  </Button>
                                )}
                                <Button color="danger" size="sm" outline onClick={() => handleDelete(serverItem!.id)} disabled={serverItem?.deleting || serverItem?.saving} style={{ padding: "2px 6px" }}>
                                  {serverItem?.deleting ? <Spinner size="sm" /> : <i className="ri-delete-bin-line" />}
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total weight summary */}
              <div
                className="d-flex align-items-center gap-3 px-3 py-2 rounded mb-3"
                style={{ background: "var(--vz-warning-bg-subtle)", border: "1px solid var(--vz-warning-border-subtle)" }}
              >
                <i className="ri-scales-3-line text-warning" style={{ fontSize: 16 }} />
                <span className="fw-semibold text-warning" style={{ fontSize: 13 }}>
                  Total Weight: {totalWeight}
                </span>
                <span className="text-muted ms-auto" style={{ fontSize: 12 }}>
                  {rows.length} reward{rows.length !== 1 ? "s" : ""}
                </span>
              </div>
            </>
          ) : (
            <div
              className="text-center py-3 text-muted rounded mb-3"
              style={{
                fontSize: 13,
                border: `2px dashed ${validationError ? "#f06548" : "var(--vz-border-color)"}`,
                background: validationError ? "#fff5f3" : "transparent",
              }}
            >
              <i className="ri-gift-2-line d-block mb-1 fs-3 opacity-25" />
              No rewards configured yet
            </div>
          )}

          {/* Add reward row */}
          {availableProducts.length > 0 ? (
            <div className="border rounded p-3" style={{ background: "var(--vz-secondary-bg)" }}>
              <p className="fw-medium mb-2" style={{ fontSize: 13 }}>
                <i className="ri-add-circle-line me-1 text-success" />Add Reward Product
              </p>
              <Row className="g-2 align-items-end">
                <Col>
                  <Label className="form-label mb-1" style={{ fontSize: 12 }}>Product</Label>
                  <Input type="select" bsSize="sm" value={addSelId} onChange={(e) => setAddSelId(e.target.value)} disabled={adding}>
                    <option value="">-- Select product --</option>
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}  (qty: {p.quantity})
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col xs="auto" style={{ minWidth: 110 }}>
                  <Label className="form-label mb-1" style={{ fontSize: 12 }}>Weight</Label>
                  <Input type="number" bsSize="sm" min="1" placeholder="e.g. 50" value={addWeight} onChange={(e) => setAddWeight(e.target.value)} disabled={adding} />
                </Col>
                <Col xs="auto">
                  <Button color="success" size="sm" onClick={handleAdd} disabled={adding || !addSelId || Number(addWeight) <= 0}>
                    {adding ? <Spinner size="sm" /> : <><i className="ri-add-line me-1" />Add</>}
                  </Button>
                </Col>
              </Row>
            </div>
          ) : (
            <p className="text-muted mb-0" style={{ fontSize: 12 }}>
              <i className="ri-information-line me-1 text-info" />
              All available normal products have been added as rewards.
            </p>
          )}
        </>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const AdminProducts = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("role") !== "ADMIN") {
      showToast.error("Admin access required");
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const [products, setProducts]             = useState<Product[]>([]);
  const [loading, setLoading]               = useState(true);
  const [page, setPage]                     = useState(0);
  const [totalPages, setTotalPages]         = useState(0);
  const [totalElements, setTotalElements]   = useState(0);
  const [typeFilter, setTypeFilter]         = useState<"ALL" | "NORMAL" | "LUCKY_DRAW">("ALL");

  // Normal products (for reward selector)
  const [normalProducts, setNormalProducts] = useState<Product[]>([]);

  const fetchNormalProducts = useCallback(async () => {
    try {
      const res = await getProducts(0, 100);
      if (res.code === 200 && res.data?.content) {
        setNormalProducts(res.data.content.filter(
          (p) => !p.productType || p.productType === "NORMAL"
        ));
      }
    } catch { /* silent */ }
  }, []);

  // Pending rewards for create mode
  const [pendingRewards, setPendingRewards]               = useState<PendingReward[]>([]);
  const pendingRewardsRef                                 = useRef<PendingReward[]>([]);
  const [rewardValidationError, setRewardValidationError] = useState<string>("");

  // Form modal
  const [formOpen, setFormOpen]       = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Images
  const [imageUploading, setImageUploading] = useState(false);
  const [pendingImages, setPendingImages]   = useState<GalleryImage[]>([]); // create mode
  const [localImages, setLocalImages]       = useState<GalleryImage[]>([]);  // edit mode

  const currentImages = editProduct ? localImages : pendingImages;

  // Delete modal
  const [deleteTarget, setDeleteTarget]   = useState<Product | null>(null);
  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadProducts = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await getProducts(p, PAGE_SIZE);
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
      showToast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(0); }, [loadProducts]);

  // ── Image handlers ────────────────────────────────────────────────────────────

  const handleAddFiles = async (files: File[]) => {
    if (editProduct) {
      // Edit mode: upload immediately, show per-image spinner
      setImageUploading(true);
      await Promise.all(files.map(async (file) => {
        const tempKey = `${Date.now()}-${Math.random()}`;
        const objUrl = URL.createObjectURL(file);
        setLocalImages(prev => [...prev, { key: tempKey, url: objUrl, uploading: true }]);
        try {
          const res = await adminUploadProductImage(editProduct.id, file);
          if (res.code === 200) {
            const serverUrl   = res.data?.imageUrl || objUrl;
            const serverImgId = res.data?.id as number | undefined;
            setLocalImages(prev => prev.map(img =>
              img.key === tempKey
                ? { key: tempKey, url: serverUrl, uploading: false, imageId: serverImgId }
                : img
            ));
            URL.revokeObjectURL(objUrl);
          } else {
            setLocalImages(prev => prev.filter(img => img.key !== tempKey));
            URL.revokeObjectURL(objUrl);
            showToast.error(res.msg || `Failed to upload "${file.name}"`);
          }
        } catch {
          setLocalImages(prev => prev.filter(img => img.key !== tempKey));
          URL.revokeObjectURL(objUrl);
          showToast.error(`Network error uploading "${file.name}"`);
        }
      }));
      setImageUploading(false);
    } else {
      // Create mode: queue for upload after product is created, preview locally
      for (const file of files) {
        const objUrl = URL.createObjectURL(file);
        setPendingImages(prev => [
          ...prev,
          { key: `${Date.now()}-${Math.random()}`, url: objUrl, file },
        ]);
      }
    }
  };

  const handleRemovePending = (key: string) => {
    setPendingImages(prev => {
      const img = prev.find(i => i.key === key);
      if (img?.file) URL.revokeObjectURL(img.url);
      return prev.filter(i => i.key !== key);
    });
  };

  const cleanupPendingImages = (images: GalleryImage[]) => {
    images.forEach(img => { if (img.file) URL.revokeObjectURL(img.url); });
  };

  const handleDeleteImage = async (imageId: number, key: string) => {
    setLocalImages(prev => prev.map(img =>
      img.key === key ? { ...img, uploading: true } : img
    ));
    try {
      const res = await adminDeleteProductImage(imageId);
      if (res.code === 200) {
        setLocalImages(prev => prev.filter(img => img.key !== key));
      } else {
        setLocalImages(prev => prev.map(img =>
          img.key === key ? { ...img, uploading: false } : img
        ));
        showToast.error(res.msg || "Failed to delete image");
      }
    } catch {
      setLocalImages(prev => prev.map(img =>
        img.key === key ? { ...img, uploading: false } : img
      ));
      showToast.error("Network error");
    }
  };

  // ── Form ──────────────────────────────────────────────────────────────────────

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name:        editProduct?.name        ?? "",
      description: editProduct?.description ?? "",
      priceWallet: editProduct?.priceWallet ?? "",
      pricePoints: editProduct?.pricePoints ?? "",
      quantity:    editProduct?.quantity    ?? "",
      productType: (editProduct?.productType ?? "NORMAL") as "NORMAL" | "LUCKY_DRAW",
    },
    validationSchema: Yup.object({
      name:        Yup.string().required("Name is required"),
      priceWallet: Yup.number().typeError("Enter a number").min(0, "Must be ≥ 0").required("Required"),
      pricePoints: Yup.number().typeError("Enter a number").min(0, "Must be ≥ 0").required("Required"),
      quantity:    Yup.number().typeError("Enter a number").min(0, "Must be ≥ 0").required("Required"),
    }),
    onSubmit: async (values) => {
      // Read from ref — avoids stale closure capturing the initial empty []
      const currentRewards = pendingRewardsRef.current;

      // Validate: Lucky Draw must have at least one reward (create mode only)
      if (!editProduct && values.productType === "LUCKY_DRAW" && currentRewards.length === 0) {
        setRewardValidationError("At least one reward product is required for a Lucky Draw.");
        document.getElementById("reward-config-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setRewardValidationError("");
      setFormLoading(true);
      try {
        const payload = {
          name:        values.name,
          description: values.description,
          priceWallet: Number(values.priceWallet),
          pricePoints: Number(values.pricePoints),
          quantity:    Number(values.quantity),
          productType: values.productType,
          // Embed rewards directly in create payload for LUCKY_DRAW
          ...(!editProduct && values.productType === "LUCKY_DRAW" && {
            rewards: currentRewards.map((r) => ({
              rewardProductId: r.product.id,
              weight: r.weight,
            })),
          }),
        };

        const res = editProduct
          ? await adminUpdateProduct(editProduct.id, payload)
          : await adminCreateProduct(payload);

        if (res.code === 200) {
          const newId = res.data?.id;
          // Upload queued images for new products
          if (!editProduct && pendingImages.length > 0 && newId) {
            for (const img of pendingImages) {
              if (img.file) {
                try { await adminUploadProductImage(newId, img.file); } catch { /* skip */ }
              }
            }
          }
          cleanupPendingImages(pendingImages);
          setPendingRewards([]);
          pendingRewardsRef.current = [];
          showToast.success(editProduct ? "Product updated" : "Product created");
          setFormOpen(false);
          loadProducts(page);
        } else {
          showToast.error(res.msg || "Failed to save product");
        }
      } catch {
        showToast.error("Network error");
      } finally {
        setFormLoading(false);
      }
    },
  });

  const openCreate = () => {
    cleanupPendingImages(pendingImages);
    setEditProduct(null);
    setPendingImages([]);
    setPendingRewards([]);
    pendingRewardsRef.current = [];
    setRewardValidationError("");
    formik.resetForm();
    setFormOpen(true);
    fetchNormalProducts();
  };

  const closeFormModal = () => {
    cleanupPendingImages(pendingImages);
    setPendingRewards([]);
    pendingRewardsRef.current = [];
    setRewardValidationError("");
    setFormOpen(false);
  };

  const handlePendingRewardsChange = (rewards: PendingReward[]) => {
    setPendingRewards(rewards);
    pendingRewardsRef.current = rewards;
    if (rewards.length > 0) setRewardValidationError("");
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setLocalImages((p.images ?? []).map(img => ({
      key: String(img.id),
      url: img.imageUrl,
      imageId: img.id,
    })));
    setFormOpen(true);
    fetchNormalProducts();
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await adminDeleteProduct(deleteTarget.id);
      if (res.code === 200) {
        showToast.success("Product deleted");
        setDeleteOpen(false);
        loadProducts(page);
      } else {
        showToast.error(res.msg || "Failed to delete");
      }
    } catch {
      showToast.error("Network error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Pagination ────────────────────────────────────────────────────────────────

  const handlePageChange = (p: number) => { setPage(p); loadProducts(p); };

  const pageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const start = Math.max(0, Math.min(page - 2, totalPages - 5));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  };

  document.title = "Product Management | Admin";

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>

          {/* Breadcrumb */}
          <Row>
            <Col xs={12}>
              <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                <h4 className="mb-sm-0">Product Management</h4>
                <ol className="breadcrumb m-0">
                  <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
                  <li className="breadcrumb-item active">Products</li>
                </ol>
              </div>
            </Col>
          </Row>

          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="border-bottom-dashed">
                  <div className="d-flex align-items-center mb-3">
                    <h5 className="card-title mb-0 flex-grow-1">
                      <i className="ri-store-2-line me-2 text-primary align-middle"></i>
                      Products
                      {totalElements > 0 && (
                        <span className="badge bg-primary-subtle text-primary ms-2 fs-12">
                          {totalElements}
                        </span>
                      )}
                    </h5>
                    <Button color="primary" size="sm" onClick={openCreate}>
                      <i className="ri-add-line me-1"></i>Add Product
                    </Button>
                  </div>

                  {/* Type filter tabs */}
                  <div className="d-flex gap-2 flex-wrap">
                    {(["ALL", "NORMAL", "LUCKY_DRAW"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setTypeFilter(t); setPage(0); loadProducts(0); }}
                        className={`btn btn-sm ${typeFilter === t ? "btn-primary" : "btn-outline-primary"}`}
                        style={{ borderRadius: 20, fontSize: 12 }}
                      >
                        {t === "ALL" && <><i className="ri-apps-line me-1" />All</>}
                        {t === "NORMAL" && <><i className="ri-store-2-line me-1" />Normal</>}
                        {t === "LUCKY_DRAW" && <><i className="ri-gift-2-line me-1" />Lucky Draw</>}
                      </button>
                    ))}
                  </div>
                </CardHeader>

                <CardBody>
                  {loading ? (
                    <div className="text-center py-5"><Spinner color="primary" /></div>
                  ) : products.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="ri-store-2-line fs-1 d-block mb-2 opacity-50"></i>
                      <p className="fs-14 mb-3">No products yet.</p>
                      <Button color="primary" onClick={openCreate}>
                        <i className="ri-add-line me-1"></i>Add First Product
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Row className="g-4">
                        {products
                          .filter((p) => typeFilter === "ALL" || p.productType === typeFilter || (typeFilter === "NORMAL" && !p.productType))
                          .map((prod) => {
                          const firstImg    = prod.images?.[0]?.imageUrl;
                          const inStock     = prod.quantity > 0;
                          const isLuckyDraw = prod.productType === "LUCKY_DRAW";
                          return (
                            <Col key={prod.id} xl={4} md={6} xs={12}>
                              <div
                                style={{
                                  borderRadius: 12,
                                  boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
                                  border: "1px solid #f0f0f0",
                                  background: "#fff",
                                  overflow: "hidden",
                                  display: "flex",
                                  flexDirection: "column",
                                  height: "100%",
                                }}
                              >
                                {/* Image */}
                                <div style={{ position: "relative", flexShrink: 0 }}>
                                  {firstImg ? (
                                    <img
                                      src={firstImg}
                                      alt={prod.name}
                                      loading="lazy"
                                      style={{ width: "100%", height: 160, objectFit: "contain", display: "block", background: "#f8f9fa", padding: 8 }}
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    />
                                  ) : (
                                    <div
                                      className="d-flex align-items-center justify-content-center bg-light"
                                      style={{ height: 160 }}
                                    >
                                      <i className="ri-image-line text-muted opacity-25" style={{ fontSize: 40 }}></i>
                                    </div>
                                  )}

                                  {/* Image count badge */}
                                  {(prod.images?.length ?? 0) > 0 && (
                                    <span
                                      className="position-absolute badge bg-dark bg-opacity-50 text-white"
                                      style={{ bottom: 8, right: 8, fontSize: 10, borderRadius: 6 }}
                                    >
                                      <i className="ri-image-line me-1"></i>
                                      {prod.images.length}
                                    </span>
                                  )}

                                  {/* Lucky Draw badge */}
                                  {isLuckyDraw && (
                                    <span
                                      className="position-absolute badge"
                                      style={{
                                        top: 8, left: 8, fontSize: 10, borderRadius: 20,
                                        background: "linear-gradient(135deg, #f7b84b, #f06548)",
                                        color: "#fff",
                                      }}
                                    >
                                      <i className="ri-gift-2-fill me-1" style={{ fontSize: 9 }} />
                                      Lucky Draw
                                    </span>
                                  )}
                                </div>

                                {/* Body */}
                                <div className="p-3 d-flex flex-column flex-grow-1">
                                  <div className="d-flex align-items-start justify-content-between mb-1 gap-2">
                                    <h6
                                      className="fw-semibold mb-0 flex-grow-1 text-truncate"
                                      style={{ fontSize: 14 }}
                                      title={prod.name}
                                    >
                                      {prod.name}
                                    </h6>
                                    <span
                                      className={`badge flex-shrink-0 ${inStock ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}
                                      style={{ fontSize: 10 }}
                                    >
                                      {inStock ? `${prod.quantity} left` : "Out of stock"}
                                    </span>
                                  </div>

                                  <p
                                    className="text-muted mb-3 flex-grow-1"
                                    style={{
                                      fontSize: 12,
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical" as any,
                                      overflow: "hidden",
                                      minHeight: "2.4em",
                                    }}
                                  >
                                    {prod.description || "No description."}
                                  </p>

                                  {/* Prices */}
                                  <div className="d-flex gap-2 mb-3">
                                    <div
                                      className="flex-grow-1 text-center py-1 px-2"
                                      style={{ background: "#f6fef9", borderRadius: 7, border: "1px solid #d1fae5" }}
                                    >
                                      <div className="text-muted" style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 600 }}>Wallet</div>
                                      <div className="fw-bold text-success" style={{ fontSize: 13 }}>
                                        RM {Number(prod.priceWallet).toFixed(2)}
                                      </div>
                                    </div>
                                    <div
                                      className="flex-grow-1 text-center py-1 px-2"
                                      style={{ background: "#fffbeb", borderRadius: 7, border: "1px solid #fde68a" }}
                                    >
                                      <div className="text-muted" style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 600 }}>Points</div>
                                      <div className="fw-bold text-warning" style={{ fontSize: 13 }}>
                                        <i className="ri-star-fill me-1" style={{ fontSize: 10 }}></i>
                                        {prod.pricePoints}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="d-flex gap-2">
                                    <Button
                                      color="primary"
                                      size="sm"
                                      className="flex-grow-1"
                                      style={{ borderRadius: 7 }}
                                      onClick={() => openEdit(prod)}
                                    >
                                      <i className="ri-edit-line me-1"></i>Edit
                                    </Button>
                                    <Button
                                      color="danger"
                                      size="sm"
                                      outline
                                      style={{ borderRadius: 7 }}
                                      onClick={() => { setDeleteTarget(prod); setDeleteOpen(true); }}
                                    >
                                      <i className="ri-delete-bin-line"></i>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Col>
                          );
                        })}
                      </Row>

                      {totalPages > 1 && (
                        <Row className="align-items-center mt-4 g-3">
                          <div className="col-sm">
                            <p className="text-muted mb-0 fs-13">
                              Showing{" "}
                              <span className="fw-semibold">
                                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)}
                              </span>{" "}
                              of <span className="fw-semibold">{totalElements}</span> products
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
            </Col>
          </Row>

        </Container>
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={formOpen}
        toggle={() => !formLoading && closeFormModal()}
        centered
        size="lg"
        scrollable
      >
        <ModalHeader
          toggle={() => !formLoading && closeFormModal()}
          className="border-bottom-dashed"
        >
          <i className={`${editProduct ? "ri-edit-line" : "ri-add-line"} me-2 text-primary align-middle`}></i>
          {editProduct ? "Edit Product" : "Add Product"}
        </ModalHeader>

        <ModalBody className="p-0">
          <Form id="product-form" onSubmit={(e) => { e.preventDefault(); formik.handleSubmit(); }}>

            {/* ── Product details ─────────────────────────────────────────── */}
            <div className="p-4 border-bottom">
              <p className="text-muted fs-11 text-uppercase fw-medium mb-3">
                <i className="ri-file-list-3-line me-1"></i>Product Details
              </p>
              <Row className="g-3">

                {/* Product Type selector */}
                <Col md={12}>
                  <Label className="form-label">Product Type</Label>
                  <div className="d-flex gap-3">
                    {(["NORMAL", "LUCKY_DRAW"] as const).map((t) => (
                      <div
                        key={t}
                        onClick={() => formik.setFieldValue("productType", t)}
                        className="flex-grow-1 text-center p-3 rounded-3"
                        style={{
                          cursor: "pointer",
                          border: formik.values.productType === t
                            ? t === "LUCKY_DRAW" ? "2px solid #f7b84b" : "2px solid #405189"
                            : "2px solid var(--vz-border-color)",
                          background: formik.values.productType === t
                            ? t === "LUCKY_DRAW" ? "var(--vz-warning-bg-subtle)" : "var(--vz-primary-bg-subtle)"
                            : "transparent",
                          transition: "all 0.2s",
                        }}
                      >
                        <i
                          className={t === "LUCKY_DRAW" ? "ri-gift-2-fill text-warning" : "ri-store-2-fill text-primary"}
                          style={{ fontSize: 22 }}
                        />
                        <div
                          className={`fw-semibold mt-1 ${t === "LUCKY_DRAW" ? "text-warning" : "text-primary"}`}
                          style={{ fontSize: 13 }}
                        >
                          {t === "LUCKY_DRAW" ? "Lucky Draw" : "Normal"}
                        </div>
                        <div className="text-muted" style={{ fontSize: 11 }}>
                          {t === "LUCKY_DRAW" ? "Reward pool product" : "Standard product"}
                        </div>
                      </div>
                    ))}
                  </div>
                </Col>

                <Col md={12}>
                  <Label className="form-label">Name <span className="text-danger">*</span></Label>
                  <Input
                    name="name"
                    type="text"
                    placeholder="Product name"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.name}
                    invalid={formik.touched.name && !!formik.errors.name}
                  />
                  {formik.touched.name && formik.errors.name && (
                    <FormFeedback>{formik.errors.name}</FormFeedback>
                  )}
                </Col>

                <Col md={12}>
                  <Label className="form-label">Description</Label>
                  <Input
                    name="description"
                    type="textarea"
                    rows={3}
                    placeholder="Describe the product…"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.description}
                  />
                </Col>

                <Col md={4}>
                  <Label className="form-label">
                    Wallet Price (RM) <span className="text-danger">*</span>
                  </Label>
                  <div className="input-group">
                    <span className="input-group-text">RM</span>
                    <Input
                      name="priceWallet"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.priceWallet}
                      invalid={formik.touched.priceWallet && !!formik.errors.priceWallet}
                    />
                    {formik.touched.priceWallet && formik.errors.priceWallet && (
                      <FormFeedback>{formik.errors.priceWallet as string}</FormFeedback>
                    )}
                  </div>
                </Col>

                <Col md={4}>
                  <Label className="form-label">
                    Points Price <span className="text-danger">*</span>
                  </Label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="ri-star-fill text-warning"></i></span>
                    <Input
                      name="pricePoints"
                      type="number"
                      min="0"
                      placeholder="0"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.pricePoints}
                      invalid={formik.touched.pricePoints && !!formik.errors.pricePoints}
                    />
                    {formik.touched.pricePoints && formik.errors.pricePoints && (
                      <FormFeedback>{formik.errors.pricePoints as string}</FormFeedback>
                    )}
                  </div>
                </Col>

                <Col md={4}>
                  <Label className="form-label">
                    Quantity <span className="text-danger">*</span>
                  </Label>
                  <Input
                    name="quantity"
                    type="number"
                    min="0"
                    placeholder="0"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.quantity}
                    invalid={formik.touched.quantity && !!formik.errors.quantity}
                  />
                  {formik.touched.quantity && formik.errors.quantity && (
                    <FormFeedback>{formik.errors.quantity as string}</FormFeedback>
                  )}
                </Col>

              </Row>
            </div>

            {/* ── Image section ────────────────────────────────────────────── */}
            <div className="p-4 border-bottom">
              <p className="text-muted fs-11 text-uppercase fw-medium mb-3">
                <i className="ri-image-line me-1"></i>Product Images
              </p>
              <ImageSection
                images={currentImages}
                onAddFiles={handleAddFiles}
                onRemove={editProduct
                  ? (key) => {
                      const img = localImages.find(i => i.key === key);
                      if (img?.imageId) handleDeleteImage(img.imageId, key);
                    }
                  : handleRemovePending
                }
                uploading={imageUploading}
                isCreateMode={!editProduct}
              />
            </div>

            {/* ── Reward configuration (Lucky Draw only) ───────────────────── */}
            {formik.values.productType === "LUCKY_DRAW" && (
              <div className="p-4" id="reward-config-section">
                <p className="text-muted fs-11 text-uppercase fw-medium mb-3">
                  <i className="ri-gift-2-line me-1"></i>Reward Configuration
                  {!editProduct && (
                    <span className="text-danger ms-1">*</span>
                  )}
                </p>
                <RewardConfigSection
                  productId={editProduct?.id}
                  normalProducts={normalProducts}
                  pendingRewards={pendingRewards}
                  onPendingChange={handlePendingRewardsChange}
                  validationError={rewardValidationError}
                />
              </div>
            )}

          </Form>
        </ModalBody>

        <ModalFooter className="border-top-dashed">
          <Button
            color="light"
            type="button"
            onClick={closeFormModal}
            disabled={formLoading}
          >
            Cancel
          </Button>
          <Button color="primary" type="submit" form="product-form" disabled={formLoading || imageUploading}>
            {formLoading && <Spinner size="sm" className="me-1" />}
            {editProduct ? "Save Changes" : "Create Product"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Delete Confirmation Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={deleteOpen}
        toggle={() => !deleteLoading && setDeleteOpen(false)}
        centered
        size="sm"
      >
        <ModalBody className="text-center p-4">
          <div className="avatar-lg mx-auto mb-3">
            <div className="avatar-title bg-danger-subtle text-danger rounded-circle fs-28">
              <i className="ri-delete-bin-line"></i>
            </div>
          </div>
          <h5 className="mb-1 fw-semibold">Delete Product?</h5>
          <p className="text-muted mb-4">
            Are you sure you want to delete{" "}
            <strong className="text-body">{deleteTarget?.name}</strong>?
            <br />
            <span className="fs-12">This action cannot be undone.</span>
          </p>
          <div className="d-flex gap-2 justify-content-center">
            <Button
              color="light"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button color="danger" onClick={confirmDelete} disabled={deleteLoading}>
              {deleteLoading && <Spinner size="sm" className="me-1" />}
              <i className="ri-delete-bin-line me-1"></i>Delete
            </Button>
          </div>
        </ModalBody>
      </Modal>

    </React.Fragment>
  );
};

export default AdminProducts;
