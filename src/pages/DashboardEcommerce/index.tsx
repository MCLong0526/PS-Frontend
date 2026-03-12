import React from "react";
import { Container } from "reactstrap";

const DashboardEcommerce = () => {
  document.title = "Dashboard | Point System";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <div>
              <h1>Welcome to Dashboard</h1>
              <p>Your content goes here.</p>
          </div>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default DashboardEcommerce;
