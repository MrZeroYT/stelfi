"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { pageVariants, fadeUpVariants, scaleInVariants } from "@/lib/animations";

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName:  z.string().min(1, "Last name is required").max(50),
  email:     z.string().email("Please enter a valid email"),
  subject:   z.string().min(1, "Subject is required").max(100),
  message:   z.string().min(10, "Message must be at least 10 characters").max(2000),
});
type ContactFormData = z.infer<typeof contactSchema>;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#8B9EC7" }}>{label}</label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-xs" style={{ color: "#FF4D6D" }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const iStyle = (hasError: boolean) => ({
  width: "100%", padding: "14px 16px", fontSize: "15px",
  background: "rgba(255,255,255,0.04)",
  border: hasError ? "1px solid rgba(255,77,109,0.6)" : "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px", color: "#ffffff", outline: "none", transition: "all 0.3s ease",
});

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess]       = useState(false);
  const [successMsg, setSuccessMsg]     = useState(
    "Thank you! We received your message and will respond within 24-48 hours."
  );

  const { register, handleSubmit, watch, reset, formState: { errors } } =
    useForm<ContactFormData>({ resolver: zodResolver(contactSchema) });
  const charCount = (watch("message") || "").length;

  const openMailto = (data: ContactFormData) => {
    const sub  = encodeURIComponent("[Stelfi] " + data.subject);
    const body = encodeURIComponent(
      "Hi Stelfi Team,\n\nName: " + data.firstName + " " + data.lastName +
      "\nEmail: " + data.email + "\n\nMessage:\n" + data.message + "\n\n---\nSent via Stelfi Contact Form"
    );
    window.open("mailto:Soladoyeabdulkabir@gmail.com?subject=" + sub + "&body=" + body, "_blank");
    setSuccessMsg("Your email client opened with your message pre-filled. Click Send in your email app to complete.");
  };

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const res    = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!result.success) openMailto(data);
    } catch { openMailto(data); }
    finally { setIsSubmitting(false); setIsSuccess(true); }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="min-h-screen pt-24 pb-20 px-4" style={{ position: "relative", zIndex: 1 }}>

      {/* Header */}
      <motion.div variants={fadeUpVariants} className="text-center max-w-2xl mx-auto mb-12">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border mb-6"
          style={{ color: "#00D4AA", borderColor: "rgba(0,212,170,0.3)", backgroundColor: "rgba(0,212,170,0.08)" }}>
          Get in Touch
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
          We Would Love to<br />
          <span style={{ background: "linear-gradient(135deg,#00D4AA,#00FFD1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Hear From You
          </span>
        </h1>
        <p className="text-base leading-relaxed" style={{ color: "#8B9EC7" }}>
          Whether you have a question, want to report a bug, or explore a partnership - we read every message.
        </p>
      </motion.div>

      {/* Form card */}
      <motion.div variants={scaleInVariants} className="glass-card max-w-2xl mx-auto" style={{ padding: "40px 36px" }}>
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center flex flex-col items-center gap-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", bounce: 0.4 }}
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
                style={{ background: "rgba(0,212,170,0.12)", border: "2px solid rgba(0,212,170,0.4)", color: "#00D4AA" }}>
                ✓
              </motion.div>
              <div>
                <h2 className="text-2xl font-black text-white mb-3">Message Sent!</h2>
                <p style={{ color: "#8B9EC7", lineHeight: 1.7, maxWidth: "440px" }}>{successMsg}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <button onClick={() => { setIsSuccess(false); reset(); setSuccessMsg("Thank you! We received your message and will respond within 24-48 hours."); }}
                  className="btn-primary px-6 py-3 rounded-xl font-bold text-sm"
                  style={{ background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.3)", color: "#00D4AA" }}>
                  Send Another
                </button>
                <Link href="/" className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-sm no-underline"
                  style={{ background: "linear-gradient(135deg,#00D4AA,#00B8A0)", color: "#050A14" }}>
                  Back to Home
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form">
              <h2 className="text-xl font-black text-white mb-2">Send Us a Message</h2>
              <p className="text-sm mb-8" style={{ color: "#8B9EC7" }}>Fill in the form below and we will get back to you shortly.</p>
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="First Name" error={errors.firstName?.message}>
                    <input {...register("firstName")} placeholder="John" style={iStyle(!!errors.firstName)} className="glass-input" />
                  </Field>
                  <Field label="Last Name" error={errors.lastName?.message}>
                    <input {...register("lastName")} placeholder="Doe" style={iStyle(!!errors.lastName)} className="glass-input" />
                  </Field>
                </div>
                <Field label="Email Address" error={errors.email?.message}>
                  <input {...register("email")} type="email" placeholder="your@email.com" style={iStyle(!!errors.email)} className="glass-input" />
                </Field>
                <Field label="Subject" error={errors.subject?.message}>
                  <input {...register("subject")} placeholder="What is this about?" style={iStyle(!!errors.subject)} className="glass-input" />
                </Field>
                <Field label="Message" error={errors.message?.message}>
                  <div className="relative">
                    <textarea {...register("message")} placeholder="Tell us what is on your mind..." rows={6}
                      style={{ ...iStyle(!!errors.message), resize: "vertical", minHeight: "140px", fontFamily: "inherit" }}
                      className="glass-input" />
                    <span className="absolute bottom-3 right-3 text-xs" style={{ color: charCount > 1800 ? "#FF4D6D" : "#4A5568" }}>
                      {charCount} / 2000
                    </span>
                  </div>
                </Field>
                <motion.button type="submit" disabled={isSubmitting}
                  whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                  whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                  className="btn-primary w-full flex items-center justify-center gap-2 font-bold text-base rounded-xl"
                  style={{ height: "52px", background: "linear-gradient(135deg,#00D4AA,#00B8A0)", color: "#050A14" }}>
                  {isSubmitting ? <><span className="animate-spin inline-block">&#8635;</span> Sending</> : "Send Message →"}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
