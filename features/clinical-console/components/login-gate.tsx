"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { NeuralVortexBackground } from "./neural-vortex-background";

export function LoginGate({
  errorMessage,
  isLoading = false,
  onLogin,
}: {
  errorMessage?: string;
  isLoading?: boolean;
  onLogin: (credentials: { email: string; password: string }) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
  const [emailVal, setEmailVal] = useState("doctor@thermoeye.demo");
  const [passVal, setPassVal] = useState("pilot-access");

  useEffect(() => {
    formRef.current?.setAttribute("data-ready", "true");
  }, []);

  return (
    <main className="lg-root">
      {/* Background — client only to avoid hydration mismatch */}
      <NeuralVortexBackground />

      {/* Card */}
      <section className="lg-card" aria-labelledby="lg-title">
        {/* Logo */}
        <div className="lg-logo-wrap">
          <Image
            src="/thermoeye-logo.png"
            alt="Thermoeye"
            width={148}
            height={84}
            priority
            className="lg-logo"
          />
        </div>

        {/* Header */}
        <div className="lg-header">
          <div className="lg-badge">
            <span className="lg-badge-dot" />
            Secure clinical access
          </div>
          <h1 id="lg-title" className="lg-title">
            AI-powered retinal<br />screening platform
          </h1>
          <p className="lg-subtitle">
            Sign in to access your clinical console and OCTA review workflow.
          </p>
        </div>

        {/* Form */}
        <form
          ref={formRef}
          className="lg-form"
          data-ready="false"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            onLogin({ email: String(fd.get("email") || ""), password: String(fd.get("password") || "") });
          }}
        >
          {/* Floating label — email */}
          <div className={`lg-field ${emailFocus || emailVal ? "lg-field--active" : ""}`}>
            <input
              id="lg-email"
              name="email"
              type="email"
              className="lg-input"
              value={emailVal}
              onChange={(e) => setEmailVal(e.target.value)}
              onFocus={() => setEmailFocus(true)}
              onBlur={() => setEmailFocus(false)}
              autoComplete="email"
              required
              aria-label="Email address"
            />
            <label htmlFor="lg-email" className="lg-label">Email address</label>
            <div className="lg-field-line" />
          </div>

          {/* Floating label — password */}
          <div className={`lg-field ${passFocus || passVal ? "lg-field--active" : ""}`}>
            <input
              id="lg-pass"
              name="password"
              type="password"
              className="lg-input"
              value={passVal}
              onChange={(e) => setPassVal(e.target.value)}
              onFocus={() => setPassFocus(true)}
              onBlur={() => setPassFocus(false)}
              autoComplete="current-password"
              required
              aria-label="Password"
            />
            <label htmlFor="lg-pass" className="lg-label">Password</label>
            <div className="lg-field-line" />
          </div>

          {errorMessage && (
            <p className="lg-error" role="alert">{errorMessage}</p>
          )}

          <button className="lg-btn" type="submit" disabled={isLoading}>
            {isLoading ? (
              <span className="lg-spinner" aria-label="Signing in…" />
            ) : (
              <>
                <span>Enter clinical console</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="lg-footer-note">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{flexShrink:0}}>
            <rect x="2" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Demo prototype — no real patient data stored or transmitted
        </p>
      </section>
    </main>
  );
}
