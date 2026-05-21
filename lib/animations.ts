import { Variants } from "framer-motion";

// pageVariants kept for import compatibility — page-level animation
// is now handled by PageTransition (opacity only). These variants are
// no longer applied to page root wrappers.
export const pageVariants: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit:    { opacity: 0, transition: { duration: 0.1, ease: "easeIn" } },
};

export const fadeUpVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05, delayChildren: 0 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
};

export const scaleInVariants: Variants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
};

export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -40 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 40 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
};

export const glowPulse: Variants = {
  initial: { boxShadow: "0 0 0 0 rgba(0, 212, 170, 0)" },
  animate: {
    boxShadow: [
      "0 0 0 0 rgba(0, 212, 170, 0)",
      "0 0 20px 4px rgba(0, 212, 170, 0.2)",
      "0 0 0 0 rgba(0, 212, 170, 0)",
    ],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

export const numberVariants: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: "backOut" },
  },
};

export const hoverLift: Variants = {
  rest: { y: 0, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)" },
  hover: {
    y: -6,
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 212, 170, 0.15)",
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export const arrowRotate = {
  rest: { rotate: 0 },
  hover: {
    rotate: 180,
    transition: { duration: 0.4, ease: "backOut" },
  },
};

export const shimmerVariants: Variants = {
  initial: { backgroundPosition: "-1000px 0" },
  animate: {
    backgroundPosition: "1000px 0",
    transition: { duration: 2, repeat: Infinity, ease: "linear" },
  },
};
