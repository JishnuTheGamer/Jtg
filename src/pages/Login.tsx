import React, { useState, useEffect } from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import axios from "axios";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  
  const { login } = useAuth();
  const { panelName, enableLoginAnimation } = useSettings();
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
        <p className="login-subtitle">Welcome to the nature</p>
        
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
      </div>
      
      {isLoading && <LoadingOverlay message="Authenticating..." />}
    </div>
  );
}
