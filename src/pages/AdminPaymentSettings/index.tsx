import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, Row, Col, Card, CardBody, CardHeader,
  Button, Input, Label, Spinner,
} from "reactstrap";
import {
  getAdminPaymentSettings, updatePaymentSettings, uploadPaymentQR,
  PaymentSettings,
} from "../../helpers/paymentApi";
import { showToast } from "../../helpers/appToast";

const AdminPaymentSettings = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("role") !== "ADMIN") {
      showToast.error("Admin access required");
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  // Bank form state
  const [bankName,      setBankName]      = useState("");
  const [accountName,   setAccountName]   = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // QR state — qrCodeUrl holds the saved/uploaded URL; qrPreview is what the img tag shows
  const [qrCodeUrl,     setQrCodeUrl]     = useState("");
  const [qrPreview,     setQrPreview]     = useState<string | null>(null);
  const [uploadingQR,   setUploadingQR]   = useState(false);
  const [selectedFile,  setSelectedFile]  = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getAdminPaymentSettings();
        if (res.code === 200 && res.data) {
          const d = res.data;
          setSettings(d);
          setBankName(d.bankName ?? "");
          setAccountName(d.accountName ?? "");
          setAccountNumber(d.accountNumber ?? "");
          setQrCodeUrl(d.qrCodeUrl ?? "");
          setQrPreview(d.qrCodeUrl ?? null);
        }
      } catch {
        showToast.error("Failed to load payment settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setQrPreview(objectUrl);
  };

  const handleUploadQR = async () => {
    if (!selectedFile) return;
    setUploadingQR(true);
    try {
      const res = await uploadPaymentQR(selectedFile);
      if (res.code === 200 && res.data) {
        const uploadedUrl: string = res.data;
        // Revoke blob URL and switch to the real server URL
        if (qrPreview?.startsWith("blob:")) URL.revokeObjectURL(qrPreview);
        setQrCodeUrl(uploadedUrl);
        setQrPreview(uploadedUrl);
        setSelectedFile(null);
        showToast.success("QR code uploaded!");
      } else {
        showToast.error(res.message || res.msg || "Upload failed");
      }
    } catch {
      showToast.error("Network error");
    } finally {
      setUploadingQR(false);
    }
  };

  const handleSave = async () => {
    if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
      showToast.error("Please fill in all bank details");
      return;
    }
    setSaving(true);
    try {
      const res = await updatePaymentSettings({
        bankName,
        accountName,
        accountNumber,
        qrCodeUrl: qrCodeUrl || undefined,
      });
      if (res.code === 200) {
        showToast.success("Payment settings saved!");
        setSettings({ bankName, accountName, accountNumber, qrCodeUrl: qrCodeUrl || undefined });
      } else {
        showToast.error(res.message || res.msg || "Failed to save settings");
      }
    } catch {
      showToast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  document.title = "Payment Settings | Admin";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>

          {/* Breadcrumb */}
          <Row>
            <Col xs={12}>
              <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                <h4 className="mb-sm-0">Payment Settings</h4>
                <ol className="breadcrumb m-0">
                  <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
                  <li className="breadcrumb-item active">Payment Settings</li>
                </ol>
              </div>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-5"><Spinner color="primary" /></div>
          ) : (
            <Row className="g-4">

              {/* ── Bank Details ─────────────────────────────────────────────── */}
              <Col lg={7}>
                <Card className="shadow-sm border-0">
                  <CardHeader className="border-bottom-dashed bg-transparent">
                    <h5 className="card-title mb-0">
                      <i className="ri-bank-line me-2 text-primary align-middle"></i>
                      Bank Account Details
                    </h5>
                  </CardHeader>
                  <CardBody className="p-4">
                    <p className="text-muted fs-13 mb-4">
                      This information will be shown to customers when they select Manual Online Banking as their payment method.
                    </p>

                    <div className="mb-3">
                      <Label className="form-label fw-medium">
                        Bank Name <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. Maybank, CIMB, Public Bank"
                        className="rounded-3"
                      />
                    </div>

                    <div className="mb-3">
                      <Label className="form-label fw-medium">
                        Account Name <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Account holder name"
                        className="rounded-3"
                      />
                    </div>

                    <div className="mb-4">
                      <Label className="form-label fw-medium">
                        Account Number <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="e.g. 1234-5678-9012"
                        className="rounded-3 font-monospace"
                      />
                    </div>

                    {/* Customer preview */}
                    {(bankName || accountName || accountNumber) && (
                      <div className="rounded-3 p-3 mb-4"
                        style={{ background: "var(--vz-secondary-bg)", border: "1px solid var(--vz-border-color)" }}>
                        <p className="text-muted fs-11 text-uppercase fw-medium mb-2">Customer Preview</p>
                        <div className="d-flex align-items-center gap-3">
                          <div className="avatar-sm flex-shrink-0">
                            <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-18">
                              <i className="ri-bank-line"></i>
                            </div>
                          </div>
                          <div>
                            <p className="fw-bold mb-0 fs-14">{bankName || "—"}</p>
                            <p className="text-muted mb-0 fs-12">{accountName || "—"}</p>
                            <p className="fw-semibold mb-0 fs-13 font-monospace text-primary">{accountNumber || "—"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button color="primary" className="rounded-3 px-4" onClick={handleSave} disabled={saving}>
                      {saving
                        ? <><Spinner size="sm" className="me-1" />Saving…</>
                        : <><i className="ri-save-line me-1"></i>Save Settings</>}
                    </Button>
                  </CardBody>
                </Card>
              </Col>

              {/* ── QR Code Upload ────────────────────────────────────────────── */}
              <Col lg={5}>
                <Card className="shadow-sm border-0">
                  <CardHeader className="border-bottom-dashed bg-transparent">
                    <h5 className="card-title mb-0">
                      <i className="ri-qr-code-line me-2 text-success align-middle"></i>
                      Payment QR Code
                    </h5>
                  </CardHeader>
                  <CardBody className="p-4">
                    <p className="text-muted fs-13 mb-3">
                      Upload a QR code image for instant bank transfer (DuitNow, Touch 'n Go, etc.).
                    </p>

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="d-none"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                        e.target.value = "";
                      }}
                    />

                    {/* QR image preview */}
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3 mb-3"
                      style={{
                        height: 220, border: "2px dashed var(--vz-border-color)",
                        background: "var(--vz-secondary-bg)", overflow: "hidden",
                        cursor: "pointer",
                      }}
                      onClick={() => !uploadingQR && fileInputRef.current?.click()}
                    >
                      {uploadingQR ? (
                        <div className="text-center">
                          <Spinner color="primary" className="mb-2" />
                          <p className="text-muted fs-13 mb-0">Uploading…</p>
                        </div>
                      ) : qrPreview ? (
                        <img
                          src={qrPreview}
                          alt="Payment QR"
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: 12 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="text-center">
                          <i className="ri-upload-cloud-2-line text-muted d-block mb-2" style={{ fontSize: 44, opacity: 0.35 }}></i>
                          <p className="text-muted fs-13 mb-1">Click to select an image</p>
                          <p className="text-muted fs-11 mb-0">JPG, PNG, WebP · Recommended 300×300 px</p>
                        </div>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="d-flex gap-2">
                      <Button
                        color="light"
                        className="flex-grow-1 rounded-3"
                        disabled={uploadingQR}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <i className="ri-image-add-line me-1"></i>
                        {qrPreview ? "Change Image" : "Select Image"}
                      </Button>

                      {selectedFile && (
                        <Button
                          color="success"
                          className="flex-grow-1 rounded-3"
                          disabled={uploadingQR}
                          onClick={handleUploadQR}
                        >
                          {uploadingQR
                            ? <><Spinner size="sm" className="me-1" />Uploading…</>
                            : <><i className="ri-upload-2-line me-1"></i>Upload</>}
                        </Button>
                      )}
                    </div>

                    {selectedFile && !uploadingQR && (
                      <p className="text-muted fs-11 mt-2 mb-0 text-center">
                        <i className="ri-information-line me-1"></i>
                        Click <strong>Upload</strong> to save the image to the server.
                      </p>
                    )}

                    {!selectedFile && qrCodeUrl && (
                      <p className="text-success fs-11 mt-2 mb-0 text-center">
                        <i className="ri-checkbox-circle-line me-1"></i>QR code saved
                      </p>
                    )}
                  </CardBody>
                </Card>
              </Col>

            </Row>
          )}

        </Container>
      </div>
    </React.Fragment>
  );
};

export default AdminPaymentSettings;
