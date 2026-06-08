"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, AlertTriangle, Sparkles, X } from "lucide-react";

export default function LoginCardSection({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // 3D Tilt Card Math using Framer Motion values
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const rotateX = useTransform(y, [0, 1], [12, -12]);
  const rotateY = useTransform(x, [0, 1], [-12, 12]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Initial validations
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      setLoading(false);

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
        }, 900);
      } else {
        // Warning pop message
        setError(data.error || "Authentication failed. Incorrect email or password.");
      }
    } catch (err) {
      setLoading(false);
      setError("Unable to connect to the authentication server. Please try again.");
    }
  };

  // Canvas background particles
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();

    type Star = { x: number; y: number; size: number; color: string; speed: number; alpha: number; angle: number };
    let stars: Star[] = [];
    let raf = 0;

    const makeStar = (): Star => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.5 ? "rgba(168, 85, 247, " : "rgba(59, 130, 246, ",
      speed: Math.random() * 0.3 + 0.1,
      alpha: Math.random() * 0.4 + 0.2,
      angle: Math.random() * Math.PI * 2,
    });

    const init = () => {
      stars = [];
      const count = Math.floor((canvas.width * canvas.height) / 12000);
      for (let i = 0; i < count; i++) stars.push(makeStar());
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.y -= s.speed;
        s.x += Math.sin(s.angle) * 0.1;
        if (s.y < 0) {
          s.y = canvas.height;
          s.x = Math.random() * canvas.width;
        }
        ctx.fillStyle = `${s.color}${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", setSize);
    init();
    draw();

    return () => {
      window.removeEventListener("resize", setSize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="fixed inset-0 bg-zinc-950 text-zinc-50 overflow-hidden flex items-center justify-center font-sans">
      {/* 3D animated background glow shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-45 -right-45 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]" 
        style={{
          backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
          backgroundSize: "24px 24px"
        }}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Modern Header */}
      <header className="absolute left-0 right-0 top-0 flex items-center justify-between px-8 py-6 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-600/20">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
            FINFRIEND
          </span>
        </div>
        <div className="text-xs text-zinc-500 tracking-[0.15em] uppercase">Security Portal</div>
      </header>

      {/* Custom Sliding 3D Warning Pop-up message */}
      <div className="absolute top-10 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9, rotateX: -20 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              className="pointer-events-auto flex items-center justify-between gap-4 p-4 rounded-xl border border-red-500/30 bg-zinc-900/90 backdrop-blur-md text-red-400 shadow-[0_15px_30px_rgba(239,68,68,0.2)] max-w-sm w-full"
              style={{ transformStyle: "preserve-3d", perspective: 800 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-sm shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-zinc-100">Authentication Warning</div>
                  <div className="text-xs text-zinc-400 font-medium leading-relaxed mt-0.5">{error}</div>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-zinc-800 rounded-lg transition-colors duration-200"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3D Perspective Card Container */}
      <div 
        className="w-full max-w-md px-4 z-10"
        style={{ perspective: "1200px" }}
      >
        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
              }}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88, rotateX: -45, transition: { duration: 0.4 } }}
              transition={{ type: "spring", stiffness: 70, damping: 15 }}
              className="relative w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] hover:border-zinc-700/60 transition-colors duration-300"
            >
              {/* Inner ambient card glow */}
              <div className="absolute inset-x-0 -top-px h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent" />

              <Card className="border-0 bg-transparent shadow-none w-full">
                <CardHeader className="space-y-2 pt-8 pb-4 text-center" style={{ transform: "translateZ(40px)", transformStyle: "preserve-3d" }}>
                  <CardTitle className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-400">
                    Sign In
                  </CardTitle>
                  <CardDescription className="text-zinc-400/80 text-sm">
                    Enter your email and password to log in
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-2 pb-8 px-8">
                  <form onSubmit={handleLogin} className="space-y-5" style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}>
                    
                    {/* Email Input */}
                    <div className="space-y-1.5" style={{ transform: "translateZ(20px)" }}>
                      <Label htmlFor="email" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Email Address
                      </Label>
                      <div className="relative group">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="user@finfriend.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11 pl-11 bg-zinc-950/80 border-zinc-800/80 text-zinc-100 placeholder:text-zinc-600 rounded-xl focus:border-violet-500/80 focus:ring-violet-500/15 transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5" style={{ transform: "translateZ(20px)" }}>
                      <Label htmlFor="password" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Password
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 pl-11 pr-11 bg-zinc-950/80 border-zinc-800/80 text-zinc-100 placeholder:text-zinc-600 rounded-xl focus:border-violet-500/80 focus:ring-violet-500/15 transition-all duration-300"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 transition-colors duration-200"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={loading}
                      style={{ transform: "translateZ(40px)" }}
                      className="w-full h-11 relative rounded-xl overflow-hidden font-semibold transition-all duration-300 border border-violet-500/20 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_25px_rgba(124,58,237,0.55)] active:scale-[0.98] disabled:opacity-50 mt-2"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Securing session...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>Authenticate Session</span>
                        </div>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            /* 3D Success entry sequence */
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0, rotateY: 90 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 12 }}
              className="w-full py-16 flex flex-col items-center justify-center bg-zinc-900/60 border border-violet-500/30 rounded-2xl backdrop-blur-xl shadow-2xl text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 mb-6"
              >
                <ShieldCheck className="h-10 w-10 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Access Granted</h2>
              <p className="text-zinc-400 text-sm max-w-xs mx-auto">
                Securely decrypting session and loading workspace... Welcome back!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ambient bottom footer */}
      <footer className="absolute bottom-6 text-zinc-600 text-xs tracking-wider">
        © 2026 FINFRIEND PLATFORM. ALL RIGHTS RESERVED.
      </footer>
    </section>
  );
}
