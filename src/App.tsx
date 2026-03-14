import React from 'react';

// SCSS theme
import './assets/scss/themes.scss';

// react-toastify styles (needed once, globally)
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

// Routes
import Route from './Routes';

// Fake Backend (keeps all non-auth Axios calls working with mock data)
import fakeBackend from "./helpers/AuthType/fakeBackend";
fakeBackend();

function App() {
  return (
    <React.Fragment>
      <Route />

      {/* Global toast container — must be above Velzon's sidebar (z-index 1002) and overlay (1004) */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable={false}
        style={{ zIndex: 9999 }}
      />
    </React.Fragment>
  );
}

export default App;
