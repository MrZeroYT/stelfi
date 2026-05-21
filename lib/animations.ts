import { Variants } from "framer-motion";

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -5,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

export const fadeUpVariants: Variants = {
  initial: { opacity: 0, y: 40 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export const scaleInVariants: Variants = {
  initial: { opacity: 0, scale: 0.94 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
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
