"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
  slideInLeft,
  slideInRight,
} from "@/lib/animations";

// ── Schema ────────────────────────────────────────────────────
const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50, "Too long"),
  lastName:  z.string().min(1, "Last name is required").max(50, "Too long"),
  email:     z.string().email("Please enter a valid email"),
  subject:   z.string().min(1, "Subject is required").max(100, "Too long"),
  message:   z.string().min(10, "Message must be at least 10 characters").max(2000, "Message too long (max 2000 chars)"),
});

type ContactFormData = z.infer<typeof contactSchema>;

// ── Field wrapper ─────────────────────────────────────────────
function Field({
  label, error, children,
}: {
  label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#8B9EC7" }}>
        {label}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs"
            style={{ color: "#FF4D6D" }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputStyle = (hasError: boolean) => ({
  width: "100%",
  padding: "14px 16px",
  fontSize: "15px",
  background: "rgba(255,255,255,0.04)",
  border: `1px solid ${hasError ? "rgba(255,77,109,0.6)" : "rgba(255,255,255,0.08)"}`,
  borderRadius: "12px",
  color: "#ffffff",
  outline: "none",
  transition: "all 0.3s ease",
  boxShadow: hasError ? "0 0 0 3px rgba(255,77,109,0.1)" : undefined,
});

// ── Page ──────────────────────────────────────────────────────
export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess,    setIsSuccess]    = useState(false);
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{ firstName: string; email: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({ resolver: zodResolver(contactSchema) });

  const messageValue = watch("message") || "";
  const charCount    = messageValue.length;

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const res    = await fetch("/api/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setSubmittedData({ firstName: data.firstName, email: data.email });
        setIsSuccess(true);
      } else {
        setApiError(result.message || "Something went wrong");
      }
    } catch {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen pt-24 pb-20 px-4"
      style={{ position: "relative", zIndex: 1 }}
    >
      <div className="max-w-6xl mx-auto">

        {/* ── Hero ── */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-16"
        >
          <motion.span
            variants={staggerItem}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border mb-8"
            style={{ color: "#00D4AA", borderColor: "rgba(0,212,170,0.3)", backgroundColor: "rgba(0,212,170,0.08)" }}
          >
            Get in Touch
          </motion.span>
          <motion.h1 variants={staggerItem} className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            We Would Love to<br />
            <span
              style={{
                background: "linear-gradient(135deg, #00D4AA, #00FFD1)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Hear From You
            </span>
          </motion.h1>
          <motion.p variants={staggerItem} className="max-w-xl mx-auto text-base leading-relaxed" style={{ color: "#8B9EC7" }}>
            Whether you have a question about Stelfi, want to report a bug, suggest a feature,
            or explore a partnership — our team is here and we respond to every message.
          </motion.p>
        </motion.div>

        {/* ── Two column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── LEFT: Contact info ── */}
          <motion.div
            variants={slideInLeft}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="glass-card p-8 flex flex-col gap-6 h-full">
              <h2 className="text-xl font-black text-white">Contact Information</h2>

              <div className="flex flex-col gap-5">
                {[
                  { icon: "📍", label: "Based in", value: "Africa · Building for the World", link: null },
                  { icon: "🌐", label: "Platform", value: "stelfi.xyz", link: "https://stelfi.xyz" },
                  { icon: "📧", label: "Email", value: "Soladoyeabdulkabir@gmail.com", link: "mailto:Soladoyeabdulkabir@gmail.com" },
                  { icon: "⏱", label: "Response Time", value: "We typically respond within 24–48 hours", link: null },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: "rgba(0,212,170,0.1)" }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: "#8B9EC7" }}>
                        {item.label}
                      </p>
                      {item.link ? (
                        <a
                          href={item.link}
                          className="text-sm font-medium no-underline hover:underline"
                          style={{ color: "#00D4AA" }}
                          target={item.link.startsWith("http") ? "_blank" : undefined}
                          rel="noopener noreferrer"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-sm text-white">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "24px" }}>
                <h3 className="text-sm font-bold text-white mb-3">Connect With Us</h3>
                <div className="space-y-3 text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>
                  <p>
                    Stelfi is an open, community-driven project built on Arc Network. We welcome
                    builders, users, investors, and anyone passionate about the future of stablecoin finance.
                  </p>
                  <p>
                    Your feedback directly shapes how we build. Every message is read by the founding team.
                  </p>
                </div>
              </div>

              <div
                className="mt-auto pt-6 text-xs text-center"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "#4A5568" }}
              >
                <p>Built on Arc Network · Powered by USDC</p>
                <p>© 2026 Stelfi</p>
              </div>
            </div>
          </motion.div>

          {/* ── RIGHT: Form ── */}
          <motion.div
            variants={slideInRight}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.1 }}
            className="lg:col-span-3"
          >
            <AnimatePresence mode="wait">
              {isSuccess && submittedData ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-12 text-center flex flex-col items-center gap-6"
                  style={{ border: "1px solid rgba(0,212,170,0.3)" }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", bounce: 0.4 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                    style={{ background: "rgba(0,212,170,0.12)", border: "2px solid rgba(0,212,170,0.4)" }}
                  >
                    ✓
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-black text-white mb-3">Message Sent Successfully!</h2>
                    <p style={{ color: "#8B9EC7" }}>
                      Thank you, <span style={{ color: "#00D4AA" }}>{submittedData.firstName}</span>!
                      We have received your message and will respond to{" "}
                      <span style={{ color: "#00D4AA" }}>{submittedData.email}</span> within 24–48 hours.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 mt-2">
                    <button
                      onClick={() => { setIsSuccess(false); reset(); }}
                      className="btn-primary px-6 py-3 rounded-xl font-bold text-sm"
                      style={{ background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.3)", color: "#00D4AA" }}
                    >
                      Send Another Message
                    </button>
                    <Link
                      href="/"
                      className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-sm no-underline transition-all"
                      style={{ background: "linear-gradient(135deg,#00D4AA,#00B8A0)", color: "#050A14" }}
                    >
                      Back to Home
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="form" className="glass-card p-8">
                  <h2 className="text-xl font-black text-white mb-2">Send Us a Message</h2>
                  <p className="text-sm mb-8" style={{ color: "#8B9EC7" }}>
                    Fill in the form below and we will get back to you shortly.
                  </p>

                  <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                    {/* Row 1: First + Last name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="First Name" error={errors.firstName?.message}>
                        <input
                          {...register("firstName")}
                          placeholder="John"
                          style={inputStyle(!!errors.firstName)}
                          className="glass-input"
                        />
                      </Field>
                      <Field label="Last Name" error={errors.lastName?.message}>
                        <input
                          {...register("lastName")}
                          placeholder="Doe"
                          style={inputStyle(!!errors.lastName)}
                          className="glass-input"
                        />
                      </Field>
                    </div>

                    {/* Row 2: Email */}
                    <Field label="Email Address" error={errors.email?.message}>
                      <input
                        {...register("email")}
                        type="email"
                        placeholder="your@email.com"
                        style={inputStyle(!!errors.email)}
                        className="glass-input"
                      />
                    </Field>

                    {/* Row 3: Subject */}
                    <Field label="Subject" error={errors.subject?.message}>
                      <input
                        {...register("subject")}
                        placeholder="What is this about?"
                        style={inputStyle(!!errors.subject)}
                        className="glass-input"
                      />
                    </Field>

                    {/* Row 4: Message */}
                    <Field label="Message" error={errors.message?.message}>
                      <div className="relative">
                        <textarea
                          {...register("message")}
                          placeholder="Tell us what is on your mind..."
                          rows={6}
                          style={{
                            ...inputStyle(!!errors.message),
                            resize: "vertical",
                            minHeight: "140px",
                            fontFamily: "inherit",
                          }}
                          className="glass-input"
                        />
                        <span
                          className="absolute bottom-3 right-3 text-xs"
                          style={{ color: charCount > 1800 ? "#FF4D6D" : "#4A5568" }}
                        >
                          {charCount} / 2000
                        </span>
                      </div>
                    </Field>

                    {/* API error */}
                    <AnimatePresence>
                      {apiError && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="glass-card p-4 text-sm"
                          style={{ border: "1px solid rgba(255,77,109,0.3)", color: "#FF4D6D" }}
                        >
                          ❌ {apiError}. Or email us directly at{" "}
                          <a href="mailto:Soladoyeabdulkabir@gmail.com" className="underline" style={{ color: "#FF4D6D" }}>
                            Soladoyeabdulkabir@gmail.com
                          </a>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                      whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                      className="btn-primary w-full flex items-center justify-center gap-2 font-bold text-base rounded-xl"
                      style={{
                        height: "52px",
                        background: "linear-gradient(135deg,#00D4AA,#00B8A0)",
                        color: "#050A14",
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin inline-block">⟳</span> Sending...
                        </>
                      ) : (
                        "Send Message →"
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
