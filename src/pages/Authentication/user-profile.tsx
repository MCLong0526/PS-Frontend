import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Spinner,
} from "reactstrap";

import avatar from "../../assets/images/users/avatar-1.jpg";
import { getCurrentUser, UserProfile as UserProfileData } from "../../helpers/userApi";

const UserProfile = () => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the real user profile from GET /api/users/me
    getCurrentUser()
      .then((data) => {
        setProfile(data);
      })
      .catch(() => {
        // Network failure — profile stays null, fallback values shown
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  document.title = "Profile | Velzon - React Admin & Dashboard Template";

  return (
    <React.Fragment>
      <div className="page-content mt-lg-5">
        <Container fluid>
          {loading ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
            </div>
          ) : (
            <Row>
              <Col lg="12">
                {/* ── Profile card ─────────────────────────────── */}
                <Card>
                  <CardBody>
                    <div className="d-flex">
                      <div className="mx-3">
                        <img
                          src={avatar}
                          alt=""
                          className="avatar-md rounded-circle img-thumbnail"
                        />
                      </div>
                      <div className="flex-grow-1 align-self-center">
                        <div className="text-muted">
                          <h5>{profile?.username || "—"}</h5>
                          <p className="mb-1">Email : {profile?.email || "—"}</p>
                          <p className="mb-1">Id : #{profile?.id || "—"}</p>
                          {profile?.phone && (
                            <p className="mb-1">Phone : {profile.phone}</p>
                          )}
                          <p className="mb-0">Points : <b>{profile?.points ?? 0}</b></p>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* ── Extra info card ───────────────────────────── */}
                <Card>
                  <CardBody>
                    <h5 className="card-title mb-3">Account Details</h5>
                    <Row>
                      <Col sm={6}>
                        <div className="mb-3">
                          <label className="form-label text-muted">Username</label>
                          <p className="fw-medium">{profile?.username || "—"}</p>
                        </div>
                      </Col>
                      <Col sm={6}>
                        <div className="mb-3">
                          <label className="form-label text-muted">Email</label>
                          <p className="fw-medium">{profile?.email || "—"}</p>
                        </div>
                      </Col>
                      <Col sm={6}>
                        <div className="mb-3">
                          <label className="form-label text-muted">Phone</label>
                          <p className="fw-medium">{profile?.phone || "—"}</p>
                        </div>
                      </Col>
                      <Col sm={6}>
                        <div className="mb-3">
                          <label className="form-label text-muted">Points</label>
                          <p className="fw-medium">{profile?.points ?? 0}</p>
                        </div>
                      </Col>
                      {profile?.wallet && (
                        <Col sm={12}>
                          <div className="mb-3">
                            <label className="form-label text-muted">Wallet</label>
                            <p className="fw-medium">{profile.wallet}</p>
                          </div>
                        </Col>
                      )}
                      {profile?.referralCode && (
                        <Col sm={6}>
                          <div className="mb-3">
                            <label className="form-label text-muted">Referral Code</label>
                            <p className="fw-medium">{profile.referralCode}</p>
                          </div>
                        </Col>
                      )}
                    </Row>
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

export default UserProfile;
