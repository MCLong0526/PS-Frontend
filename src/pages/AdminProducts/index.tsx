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
  adminUploadProductImage, adminDeleteProductImage, Product,
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
    },
    validationSchema: Yup.object({
      name:        Yup.string().required("Name is required"),
      priceWallet: Yup.number().typeError("Enter a number").min(0, "Must be ≥ 0").required("Required"),
      pricePoints: Yup.number().typeError("Enter a number").min(0, "Must be ≥ 0").required("Required"),
      quantity:    Yup.number().typeError("Enter a number").min(0, "Must be ≥ 0").required("Required"),
    }),
    onSubmit: async (values) => {
      setFormLoading(true);
      try {
        const payload = {
          name:        values.name,
          description: values.description,
          priceWallet: Number(values.priceWallet),
          pricePoints: Number(values.pricePoints),
          quantity:    Number(values.quantity),
        };

        const res = editProduct
          ? await adminUpdateProduct(editProduct.id, payload)
          : await adminCreateProduct(payload);

        if (res.code === 200) {
          // Upload queued images for new products
          if (!editProduct && pendingImages.length > 0) {
            const newId = res.data?.id;
            if (newId) {
              for (const img of pendingImages) {
                if (img.file) {
                  try { await adminUploadProductImage(newId, img.file); } catch { /* skip */ }
                }
              }
            }
          }
          cleanupPendingImages(pendingImages);
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
    formik.resetForm();
    setFormOpen(true);
  };

  const closeFormModal = () => {
    cleanupPendingImages(pendingImages);
    setFormOpen(false);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setLocalImages((p.images ?? []).map(img => ({
      key: String(img.id),
      url: img.imageUrl,
      imageId: img.id,
    })));
    setFormOpen(true);
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
                <CardHeader className="d-flex align-items-center border-bottom-dashed">
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
                        {products.map((prod) => {
                          const firstImg = prod.images?.[0]?.imageUrl;
                          const inStock  = prod.quantity > 0;
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
            <div className="p-4">
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
