// @ts-nocheck
import React, { useState, useEffect } from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useNavigate, Link } from "react-router-dom";
import gsap from "gsap";
import axios from "axios";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  const { login } = useAuth();
  const { 
    panelName, enableLoginAnimation, enableRegistration,
    enableGoogleLogin, firebaseApiKey, firebaseAuthDomain, firebaseProjectId,
    firebaseStorageBucket, firebaseMessagingSenderId, firebaseAppId
  } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    let ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => setIntroDone(true)
      });
      if (enableLoginAnimation !== false) {
        // Cinematic Intro Sequence
        gsap.set(".desert-wrapper", { backgroundColor: "#000" });
        gsap.set(".login-card", { autoAlpha: 0, y: 50 });
        gsap.set(".parallax-container", { scale: 1.1, opacity: 0 });

        const shakeKeyframes = Array.from({length: 20}).map(() => ({
          x: Math.random() * 40 - 20,
          y: Math.random() * 40 - 20,
          rotation: Math.random() * 4 - 2,
          duration: 0.05
        }));
        shakeKeyframes.push({ x: 0, y: 0, rotation: 0, duration: 0.05 });

        tl.to(".parallax-container", { opacity: 1, duration: 3, ease: "power2.inOut" })
          .to(".desert-wrapper", { backgroundColor: "#F7ABAE", duration: 1.5 }, "-=1.5")
          .to(".parallax-container", { scale: 1.3, transformOrigin: "center 35%", duration: 3, ease: "power2.inOut" }, "-=1")
          .to(".parallax-container", { scale: 1, duration: 0.5, ease: "power4.inOut" })
          .to(".parallax-container", { keyframes: shakeKeyframes, ease: "none" })
          .to(".login-card", { autoAlpha: 1, y: 0, duration: 1.2, ease: "power3.out" }, "+=0.2");
      } else {
        // Instant show
        gsap.set(".desert-wrapper", { backgroundColor: "#F7ABAE" });
        gsap.set(".login-card", { autoAlpha: 1, y: 0 });
        gsap.set(".parallax-container", { scale: 1, opacity: 1 });
        setIntroDone(true);
      }

      // Floating animation for layers
      const layers = [1, 2, 3, 4, 5, 6, 7];
      layers.forEach((layerNum) => {
        gsap.to(`.layer-${layerNum}`, {
          y: -10 - layerNum * 5, 
          duration: 3 + layerNum * 0.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1
        });
      });

      gsap.to(".layer-text", {
         y: -20,
         duration: 4,
         ease: "sine.inOut",
         yoyo: true,
         repeat: -1
      });
    });

    return () => ctx.revert();
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!introDone) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
    const layers = [1, 2, 3, 4, 5, 6, 7];
    layers.forEach((layerNum) => {
      const depth = layerNum * 10;
      gsap.to(`.layer-${layerNum}`, {
        x: -x * depth,
        duration: 1,
        ease: "power2.out",
        overwrite: "auto"
      });
    });

    gsap.to(".layer-text", {
      x: -x * 30,
      duration: 1,
      ease: "power2.out",
      overwrite: "auto"
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/auth/login", { username, password });
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!firebaseApiKey || !firebaseProjectId) {
      setError("Firebase Google Login is not configured by administrator yet.");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const fbConfig = {
        apiKey: firebaseApiKey,
        authDomain: firebaseAuthDomain,
        projectId: firebaseProjectId,
        storageBucket: firebaseStorageBucket,
        messagingSenderId: firebaseMessagingSenderId,
        appId: firebaseAppId
      };

      const app = getApps().length === 0 ? initializeApp(fbConfig) : getApp();
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      if (!googleUser.email) {
        throw new Error("No email associated with this Google account");
      }

      const res = await axios.post("/api/auth/google", {
        email: googleUser.email,
        googleId: googleUser.uid,
        name: googleUser.displayName || "",
        photoURL: googleUser.photoURL || ""
      });

      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Google Login popup was closed before completing.");
      } else if (err.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized in Firebase Console -> Auth settings -> Authorized Domains.");
      } else if (err.code === "auth/too-many-requests" || err.response?.status === 429 || err.message?.includes("429")) {
        setError("Too many login requests. Please wait a minute and try again.");
      } else {
        setError(err.response?.data?.error || err.message || "Google Authentication failed. Please check your Firebase configuration.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isDevPort3000 = typeof window !== "undefined" && (
    window.location.port === "3000" || 
    window.location.hostname === "localhost" || 
    window.location.hostname === "127.0.0.1"
  );

  return (
    <div className="desert-wrapper" onMouseMove={handleMouseMove}>
      <div className="parallax-container">
        <img src="/desert/img-bg.svg" alt="" className="parallax-layer layer-bg" />
        <img src="/desert/img-1.svg" alt="" className="parallax-layer layer-1" />
        <img src="/desert/img-2.svg" alt="" className="parallax-layer layer-2" />
        <img src="/desert/img-3.svg" alt="" className="parallax-layer layer-3" />
        
        <div className="parallax-layer layer-text">
           <h1 className="background-title">{panelName}</h1>
           <p className="background-subtitle">PANEL</p>
        </div>

        <img src="/desert/img-4.svg" alt="" className="parallax-layer layer-4" />
        <img src="/desert/img-5.svg" alt="" className="parallax-layer layer-5" />
        <img src="/desert/img-6.svg" alt="" className="parallax-layer layer-6" />
        <img src="/desert/img-7.svg" alt="" className="parallax-layer layer-7" />
      </div>

      <div className="login-card">
        <h2 className="login-title">{panelName} Login</h2>
        <p className="login-subtitle">Welcome to the panel</p>
        
        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="login-error">{error}</div>}
          
          <div className="input-group">
            <i className="ri-user-line input-icon"></i>
            <input 
              type="text" 
              name="username" 
              required 
              placeholder="Username" 
              className="login-input" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div className="input-group">
            <i className="ri-lock-line input-icon"></i>
            <input 
              type="password" 
              name="password" 
              required 
              placeholder="Password" 
              className="login-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        {enableGoogleLogin && isDevPort3000 && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", margin: "0.8rem 0" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.2)" }} />
              <span style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.6)", textTransform: "uppercase", letterSpacing: "1px" }}>OR</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.2)" }} />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                background: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(10px)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.22)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 22.3 12 23z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        )}

        {enableRegistration !== false && (
          <div style={{ marginTop: "1.2rem", textAlign: "center", fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.8)" }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#fff", fontWeight: 600, textDecoration: "underline" }}>
              Register
            </Link>
          </div>
        )}
      </div>
      
      {isLoading && <LoadingOverlay message="Authenticating..." />}
    </div>
  );
}
