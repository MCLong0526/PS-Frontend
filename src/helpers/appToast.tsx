// appToast.tsx — Velzon Toastify-style notifications using react-toastify.
//
// Matches the clean colored-background style from the Velzon HTML template
// (data-toast-className="success|warning|danger|primary").
//
// Usage:
//   showToast.success("Logged in successfully!");
//   showToast.error("Invalid password.");
//   showToast.warning("Session expiring soon.");
//   showToast.info("Welcome back!");

import React from 'react';
import { toast } from 'react-toastify';

// Velzon theme colors — match data-toast-className variants in the HTML template
const THEME: Record<string, { bg: string; icon: string }> = {
  success: { bg: '#0ab39c', icon: 'ri-checkbox-circle-fill' },
  error:   { bg: '#f06548', icon: 'ri-close-circle-fill' },
  warning: { bg: '#f7b84b', icon: 'ri-error-warning-fill' },
  info:    { bg: '#405189', icon: 'ri-information-fill' },
};

type ToastType = keyof typeof THEME;

// Inner content: icon + message + close button inline (toastify-js style)
const ToastContent = ({ type, message, closeToast }: { type: ToastType; message: string; closeToast?: () => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
    <i className={THEME[type].icon} style={{ fontSize: '20px', flexShrink: 0 }} />
    <span style={{ fontSize: '14px', fontWeight: 500, flex: 1 }}>{message}</span>
    <span
      onClick={closeToast}
      style={{ cursor: 'pointer', fontSize: '16px', opacity: 0.8, flexShrink: 0, lineHeight: 1 }}
    >
      ✕
    </span>
  </div>
);

// Shared options for all toast types
const makeOptions = (type: ToastType) => ({
  style: {
    background: THEME[type].bg,
    color: '#ffffff',
    borderRadius: '4px',
    padding: '14px 18px',
    boxShadow: '0 3px 6px -1px rgba(0,0,0,.12), 0 10px 36px -4px rgba(77,96,232,.3)',
    minWidth: '260px',
  },
  icon: false as false,
  autoClose: 3000,
  closeButton: false,
  hideProgressBar: true,
});

export const showToast = {
  success: (message: string) =>
    toast(({ closeToast }) => <ToastContent type="success" message={message} closeToast={closeToast} />, makeOptions('success')),

  error: (message: string) =>
    toast(({ closeToast }) => <ToastContent type="error" message={message} closeToast={closeToast} />, makeOptions('error')),

  warning: (message: string) =>
    toast(({ closeToast }) => <ToastContent type="warning" message={message} closeToast={closeToast} />, makeOptions('warning')),

  info: (message: string) =>
    toast(({ closeToast }) => <ToastContent type="info" message={message} closeToast={closeToast} />, makeOptions('info')),
};
