import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  Table,
  Spinner,
  Button,
} from "reactstrap";

import avatar from "../../assets/images/users/avatar-1.jpg";
import {
  getCurrentUser, fetchReferralQR, fetchWalletHistory,
  UserProfile as UserProfileData, WalletHistoryItem,
} from "../../helpers/userApi";

const UserProfile = () => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [walletHistory, setWalletHistory] = useState<WalletHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const qrBlobUrl = useRef<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((data) => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetchReferralQR()
      .then((url) => {
        qrBlobUrl.current = url;
        setQrSrc(url);
      })
      .catch(() => {})
      .finally(() => setQrLoading(false));

    fetchWalletHistory()
      .then((res) => {
        if (res?.code === 200 && Array.isArray(res.data)) {
          setWalletHistory(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));

    return () => {
      if (qrBlobUrl.current) URL.revokeObjectURL(qrBlobUrl.current);
    };
  }, []);

  const referralLink = profile?.referralCode
    ? `${window.location.origin}/register?ref=${profile.referralCode}`
    : null;

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  document.title = "Profile | Velzon - React Admin & Dashboard Template";

  if (loading) {
    return (
      <div className="page-content">
        <div className="text-center py-5">
          <Spinner color="primary" />
        </div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>

          <Row>

            {/* 1️⃣ Account Information */}
            <Col lg={4} className="mb-3">
              <Card className="h-100 mb-0">

                {/* Avatar + name header */}
                <div className="text-center pt-4 pb-3 border-bottom">
                  <div className="mb-3">
                    <img
                      src={avatar}
                      alt="avatar"
                      className="rounded-circle img-thumbnail"
                      style={{ width: "72px", height: "72px", objectFit: "cover" }}
                    />
                  </div>
                  <h5 className="mb-1 fw-semibold">{profile?.username || "—"}</h5>
                  <span className="badge bg-primary-subtle text-primary fs-12 px-2 py-1">
                    <i className="ri-shield-user-line me-1"></i>Member
                  </span>
                </div>

                <CardBody className="p-0">

                  {/* Email */}
                  <div className="d-flex align-items-center px-3 py-3 border-bottom">
                    <div className="flex-shrink-0 me-3">
                      <div className="avatar-xs">
                        <div className="avatar-title bg-info-subtle text-info rounded-circle fs-14">
                          <i className="ri-mail-line"></i>
                        </div>
                      </div>
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <p className="text-muted mb-0 fs-11 text-uppercase fw-medium">Email</p>
                      <p className="fw-semibold mb-0 text-truncate">{profile?.email || "—"}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="d-flex align-items-center px-3 py-3 border-bottom">
                    <div className="flex-shrink-0 me-3">
                      <div className="avatar-xs">
                        <div className="avatar-title bg-success-subtle text-success rounded-circle fs-14">
                          <i className="ri-phone-line"></i>
                        </div>
                      </div>
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <p className="text-muted mb-0 fs-11 text-uppercase fw-medium">Phone</p>
                      <p className="fw-semibold mb-0">{profile?.phone || "—"}</p>
                    </div>
                  </div>

                  {/* Member since */}
                  <div className="d-flex align-items-center px-3 py-3">
                    <div className="flex-shrink-0 me-3">
                      <div className="avatar-xs">
                        <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-14">
                          <i className="ri-calendar-line"></i>
                        </div>
                      </div>
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <p className="text-muted mb-0 fs-11 text-uppercase fw-medium">Member Since</p>
                      <p className="fw-semibold mb-0">
                        {profile?.createTime
                          ? new Date(profile.createTime).toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" })
                          : "—"}
                      </p>
                    </div>
                  </div>

                </CardBody>
              </Card>
            </Col>

            {/* 2️⃣ Wallet & Points */}
            <Col lg={4} className="mb-3">
              <div className="d-flex flex-column gap-3 h-100">

                {/* Wallet Balance */}
                <Card className="card-animate mb-0 flex-grow-1">
                  <CardBody className="p-4">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-3">
                        <div className="avatar-md rounded">
                          <div className="avatar-title bg-success-subtle text-success rounded fs-24">
                            <i className="ri-wallet-3-line"></i>
                          </div>
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <p className="text-uppercase fw-medium text-muted fs-12 mb-2">
                          Wallet Balance
                        </p>
                        <h3 className="fw-bold mb-0 text-success">
                          RM&nbsp;
                          <span>
                            {profile?.wallet
                              ? parseFloat(profile.wallet).toFixed(2)
                              : "0.00"}
                          </span>
                        </h3>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Points */}
                <Card className="card-animate mb-0 flex-grow-1">
                  <CardBody className="p-4">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-3">
                        <div className="avatar-md rounded">
                          <div className="avatar-title bg-warning-subtle text-warning rounded fs-24">
                            <i className="ri-star-fill"></i>
                          </div>
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <p className="text-uppercase fw-medium text-muted fs-12 mb-2">
                          Points
                        </p>
                        <h3 className="fw-bold mb-0 text-warning">
                          {profile?.points ?? 0}
                        </h3>
                      </div>
                    </div>
                  </CardBody>
                </Card>

              </div>
            </Col>

            {/* 3️⃣ Referral QR Code — unchanged */}
            <Col lg={4} className="mb-3">
              <Card className="h-100 mb-0">
                <CardBody className="d-flex flex-column align-items-center text-center">
                  <h5 className="card-title mb-1">Referral QR Code</h5>
                  <p className="text-muted fs-13 mb-3">
                    Share this code to invite friends
                  </p>

                  {qrLoading ? (
                    <div className="py-4">
                      <Spinner color="primary" />
                    </div>
                  ) : qrSrc ? (
                    <>
                      <div className="border rounded p-3 mb-3 bg-white">
                        <img
                          src={qrSrc}
                          alt="Referral QR Code"
                          width={180}
                          height={180}
                          style={{ display: "block" }}
                        />
                      </div>
                      {profile?.referralCode && (
                        <div className="mb-3">
                          <span className="badge bg-primary-subtle text-primary fs-13 px-3 py-2 rounded-pill">
                            {profile.referralCode}
                          </span>
                        </div>
                      )}
                      {referralLink && (
                        <div className="w-100">
                          <div className="input-group input-group-sm mb-2">
                            <input
                              type="text"
                              className="form-control form-control-sm text-muted"
                              value={referralLink}
                              readOnly
                            />
                            <Button
                              color={copied ? "success" : "primary"}
                              size="sm"
                              onClick={handleCopy}
                            >
                              {copied ? (
                                <><i className="ri-check-line me-1"></i>Copied</>
                              ) : (
                                <><i className="ri-file-copy-line me-1"></i>Copy</>
                              )}
                            </Button>
                          </div>
                          <p className="text-muted fs-12 mb-0">
                            Scan QR or share link to register with your referral code
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-4 text-muted">
                      <i className="ri-qr-code-line fs-1 d-block mb-2"></i>
                      <span className="fs-13">QR code unavailable</span>
                    </div>
                  )}
                </CardBody>
              </Card>
            </Col>

          </Row>

          {/* 4️⃣ Wallet Activity */}
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center border-bottom-dashed">
                  <h5 className="card-title mb-0 flex-grow-1">
                    <i className="ri-exchange-funds-line me-2 text-primary align-middle"></i>
                    Wallet Activity
                  </h5>
                  {walletHistory.length > 0 && (
                    <span className="badge bg-primary-subtle text-primary fs-12">
                      {walletHistory.length} transaction{walletHistory.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </CardHeader>
                <CardBody>
                  {historyLoading ? (
                    <div className="text-center py-4">
                      <Spinner color="primary" />
                    </div>
                  ) : walletHistory.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="ri-inbox-line fs-1 d-block mb-2 opacity-50"></i>
                      <p className="fs-14 mb-0">No wallet activity yet.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table className="table table-hover table-striped align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="text-muted fw-medium">Date</th>
                            <th className="text-muted fw-medium">Type</th>
                            <th className="text-muted fw-medium">Description</th>
                            <th className="text-muted fw-medium text-end">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {walletHistory.map((tx, i) => {
                            const amt = parseFloat(String(tx.amount));
                            const isPositive = amt >= 0;
                            return (
                              <tr key={i}>
                                <td className="text-muted fs-13">{tx.createTime || "—"}</td>
                                <td>
                                  <span className="badge bg-info-subtle text-info fs-11">
                                    {tx.type}
                                  </span>
                                </td>
                                <td className="text-muted fs-13">{tx.description || "—"}</td>
                                <td className="text-end">
                                  <span className={`fw-semibold fs-13 ${isPositive ? "text-success" : "text-danger"}`}>
                                    {isPositive ? "+" : ""}RM {Math.abs(amt).toFixed(2)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>

        </Container>
      </div>
    </React.Fragment>
  );
};

export default UserProfile;
