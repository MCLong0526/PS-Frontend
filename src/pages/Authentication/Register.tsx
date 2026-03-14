import React, { useEffect, useState } from "react";
import { Row, Col, CardBody, Card, Alert, Container, Input, Label, Form, FormFeedback, Button, Spinner } from "reactstrap";

// Formik Validation
import * as Yup from "yup";
import { useFormik } from "formik";

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// action
import { registerUser, resetRegisterFlag } from "../../slices/thunks";

//redux
import { useSelector, useDispatch } from "react-redux";

import { Link, useNavigate, useSearchParams } from "react-router-dom";

//import images
import logoLight from "../../assets/images/logo-light.png";
import ParticlesAuth from "../AuthenticationInner/ParticlesAuth";
import { createSelector } from "reselect";

const Register = () => {
    const history = useNavigate();
    const dispatch: any = useDispatch();
    const [loader, setLoader] = useState<boolean>(false);
    const [searchParams] = useSearchParams();

    // Auto-detect referral code from URL ?ref=REF-XXXX
    const refFromUrl = searchParams.get("ref") || "";

    const validation = useFormik({
        enableReinitialize: true,

        initialValues: {
            username: '',
            email: '',
            phone: '',
            password: '',
            referralCode: refFromUrl,
        },
        validationSchema: Yup.object({
            username: Yup.string().required("Please enter your username"),
            email: Yup.string().email("Please enter a valid email").required("Please enter your email"),
            phone: Yup.string().required("Please enter your phone number"),
            password: Yup.string().min(6, "Password must be at least 6 characters").required("Please enter your password"),
            referralCode: Yup.string(),
        }),
        onSubmit: (values) => {
            dispatch(registerUser(values));
            setLoader(true);
        }
    });

    const selectLayoutState = (state: any) => state.Account;
    const registerdatatype = createSelector(
        selectLayoutState,
        (account) => ({
            success: account.success,
            error: account.error
        })
    );
    const { error, success } = useSelector(registerdatatype);

    useEffect(() => {
        if (success) {
            setTimeout(() => history("/login"), 3000);
        }

        setTimeout(() => {
            dispatch(resetRegisterFlag());
            setLoader(false);
        }, 3000);

    }, [dispatch, success, error, history]);

    document.title = "Sign Up | Velzon - React Admin & Dashboard Template";

    return (
        <React.Fragment>
            <ParticlesAuth>
                <div className="auth-page-content mt-lg-5">
                    <Container>
                        <Row>
                            <Col lg={12}>
                                <div className="text-center mt-sm-5 mb-4 text-white-50">
                                    <div>
                                        <Link to="/" className="d-inline-block auth-logo">
                                            <img src={logoLight} alt="" height="20" />
                                        </Link>
                                    </div>
                                    <p className="mt-3 fs-15 fw-medium">Premium Admin & Dashboard Template</p>
                                </div>
                            </Col>
                        </Row>

                        <Row className="justify-content-center">
                            <Col md={8} lg={6} xl={5}>
                                <Card className="mt-4">
                                    <CardBody className="p-4">
                                        <div className="text-center mt-2">
                                            <h5 className="text-primary">Create New Account</h5>
                                            <p className="text-muted">Get your free account now</p>
                                        </div>
                                        <div className="p-2 mt-4">
                                            <Form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    validation.handleSubmit();
                                                    return false;
                                                }}
                                                className="needs-validation" action="#">

                                                {success && (
                                                    <>
                                                        {toast("Registration successful! Redirecting to login...", { position: "top-right", hideProgressBar: false, className: 'bg-success text-white', progress: undefined, toastId: "register-success" })}
                                                        <ToastContainer autoClose={2000} limit={1} />
                                                        <Alert color="success">
                                                            Registration successful! Redirecting to login page...
                                                        </Alert>
                                                    </>
                                                )}

                                                <div className="mb-3">
                                                    <Label htmlFor="username" className="form-label">Username <span className="text-danger">*</span></Label>
                                                    <Input
                                                        id="username"
                                                        name="username"
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="Enter username"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.username || ""}
                                                        invalid={validation.touched.username && !!validation.errors.username}
                                                    />
                                                    {validation.touched.username && validation.errors.username && (
                                                        <FormFeedback type="invalid">{validation.errors.username}</FormFeedback>
                                                    )}
                                                </div>

                                                <div className="mb-3">
                                                    <Label htmlFor="email" className="form-label">Email <span className="text-danger">*</span></Label>
                                                    <Input
                                                        id="email"
                                                        name="email"
                                                        type="email"
                                                        className="form-control"
                                                        placeholder="Enter email address"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.email || ""}
                                                        invalid={validation.touched.email && !!validation.errors.email}
                                                    />
                                                    {validation.touched.email && validation.errors.email && (
                                                        <FormFeedback type="invalid">{validation.errors.email}</FormFeedback>
                                                    )}
                                                </div>

                                                <div className="mb-3">
                                                    <Label htmlFor="phone" className="form-label">Phone <span className="text-danger">*</span></Label>
                                                    <Input
                                                        id="phone"
                                                        name="phone"
                                                        type="tel"
                                                        className="form-control"
                                                        placeholder="Enter phone number"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.phone || ""}
                                                        invalid={validation.touched.phone && !!validation.errors.phone}
                                                    />
                                                    {validation.touched.phone && validation.errors.phone && (
                                                        <FormFeedback type="invalid">{validation.errors.phone}</FormFeedback>
                                                    )}
                                                </div>

                                                <div className="mb-3">
                                                    <Label htmlFor="password" className="form-label">Password <span className="text-danger">*</span></Label>
                                                    <Input
                                                        id="password"
                                                        name="password"
                                                        type="password"
                                                        className="form-control"
                                                        placeholder="Enter password (min. 6 characters)"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.password || ""}
                                                        invalid={validation.touched.password && !!validation.errors.password}
                                                    />
                                                    {validation.touched.password && validation.errors.password && (
                                                        <FormFeedback type="invalid">{validation.errors.password}</FormFeedback>
                                                    )}
                                                </div>

                                                <div className="mb-4">
                                                    <Label htmlFor="referralCode" className="form-label">Referral Code <span className="text-muted">(optional)</span></Label>
                                                    <Input
                                                        id="referralCode"
                                                        name="referralCode"
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="Enter referral code"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.referralCode || ""}
                                                    />
                                                </div>

                                                <div className="mt-4">
                                                    <Button color="success" className="w-100" type="submit" disabled={loader}>
                                                        {loader && <Spinner size="sm" className='me-2'>Loading...</Spinner>}
                                                        Sign Up
                                                    </Button>
                                                </div>
                                            </Form>
                                        </div>
                                    </CardBody>
                                </Card>
                                <div className="mt-4 text-center">
                                    <p className="mb-0">Already have an account? <Link to="/login" className="fw-semibold text-primary text-decoration-underline"> Sign In </Link></p>
                                </div>
                            </Col>
                        </Row>
                    </Container>
                </div>
            </ParticlesAuth>
        </React.Fragment>
    );
};

export default Register;
