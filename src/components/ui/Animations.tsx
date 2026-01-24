import { ReactNode } from "react";
import { motion, Variants, HTMLMotionProps } from "framer-motion";

// ============================================
// ANIMATION VARIANTS
// ============================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } }
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } }
};

export const slideInBottom: Variants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// ============================================
// ANIMATED CONTAINER COMPONENT
// ============================================

interface AnimatedContainerProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  variants?: Variants;
  delay?: number;
}

export function AnimatedContainer({ 
  children, 
  variants = fadeInUp, 
  delay = 0,
  ...props 
}: AnimatedContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// STAGGER LIST COMPONENT
// ============================================

interface StaggerListProps {
  children: ReactNode;
  className?: string;
}

export function StaggerList({ children, className = "" }: StaggerListProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }: StaggerListProps) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// ============================================
// ADD TO CART ANIMATION
// ============================================

interface AddToCartAnimationProps {
  isAnimating: boolean;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  onComplete: () => void;
  children?: ReactNode;
}

export function AddToCartAnimation({
  isAnimating,
  startPosition,
  endPosition,
  onComplete,
  children
}: AddToCartAnimationProps) {
  if (!isAnimating) return null;

  return (
    <motion.div
      initial={{
        position: "fixed",
        top: startPosition.y,
        left: startPosition.x,
        scale: 1,
        opacity: 1,
        zIndex: 9999
      }}
      animate={{
        top: endPosition.y,
        left: endPosition.x,
        scale: 0.3,
        opacity: 0
      }}
      transition={{
        duration: 0.6,
        ease: [0.32, 0.72, 0, 1]
      }}
      onAnimationComplete={onComplete}
      className="pointer-events-none"
    >
      {children || (
        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg">
          <span className="text-2xl">🛒</span>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// HEART BURST ANIMATION (For Favorites)
// ============================================

interface HeartBurstProps {
  isActive: boolean;
  onComplete?: () => void;
}

export function HeartBurst({ isActive, onComplete }: HeartBurstProps) {
  if (!isActive) return null;

  const particles = Array.from({ length: 6 });

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((_, i) => {
        const angle = (i / particles.length) * 360;
        const distance = 30;
        const x = Math.cos((angle * Math.PI) / 180) * distance;
        const y = Math.sin((angle * Math.PI) / 180) * distance;

        return (
          <motion.div
            key={i}
            initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
            animate={{ 
              scale: [0, 1, 0],
              x: x,
              y: y,
              opacity: [1, 1, 0]
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            onAnimationComplete={i === 0 ? onComplete : undefined}
            className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2"
          >
            <span className="text-red-500 text-xs">❤️</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================
// SUCCESS CHECKMARK ANIMATION
// ============================================

interface SuccessCheckmarkProps {
  show: boolean;
  size?: number;
  onComplete?: () => void;
}

export function SuccessCheckmark({ show, size = 60, onComplete }: SuccessCheckmarkProps) {
  if (!show) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      onAnimationComplete={onComplete}
      className="flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 50 50" className="w-full h-full">
        {/* Circle */}
        <motion.circle
          cx="25"
          cy="25"
          r="23"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-green-500"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
        {/* Checkmark */}
        <motion.path
          d="M14 25L22 33L36 19"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green-500"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.3, ease: "easeInOut" }}
        />
      </svg>
    </motion.div>
  );
}

// ============================================
// COUNTER ANIMATION (For quantity changes)
// ============================================

interface AnimatedCounterProps {
  value: number;
  className?: string;
}

export function AnimatedCounter({ value, className = "" }: AnimatedCounterProps) {
  return (
    <motion.span
      key={value}
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 10, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {value}
    </motion.span>
  );
}

// ============================================
// RIPPLE EFFECT (For buttons)
// ============================================

interface RippleProps {
  x: number;
  y: number;
  onComplete: () => void;
}

export function Ripple({ x, y, onComplete }: RippleProps) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0.5 }}
      animate={{ scale: 4, opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="absolute pointer-events-none bg-white/30 rounded-full"
      style={{
        width: 40,
        height: 40,
        left: x - 20,
        top: y - 20
      }}
    />
  );
}

// ============================================
// SHAKE ANIMATION (For errors)
// ============================================

interface ShakeProps {
  children: ReactNode;
  trigger: boolean;
  className?: string;
}

export function Shake({ children, trigger, className = "" }: ShakeProps) {
  return (
    <motion.div
      animate={trigger ? {
        x: [-10, 10, -10, 10, -5, 5, 0],
        transition: { duration: 0.4 }
      } : {}}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// BOUNCE ANIMATION (For attention)
// ============================================

interface BounceProps {
  children: ReactNode;
  isActive?: boolean;
  className?: string;
}

export function Bounce({ children, isActive = true, className = "" }: BounceProps) {
  return (
    <motion.div
      animate={isActive ? {
        y: [0, -8, 0],
        transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
      } : {}}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// PULSE RING (For notifications)
// ============================================

interface PulseRingProps {
  show: boolean;
  color?: string;
}

export function PulseRing({ show, color = "primary" }: PulseRingProps) {
  if (!show) return null;

  return (
    <>
      <motion.span
        initial={{ scale: 1, opacity: 0.5 }}
        animate={{ scale: 2, opacity: 0 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
        className={`absolute inset-0 rounded-full bg-${color}`}
      />
      <motion.span
        initial={{ scale: 1, opacity: 0.3 }}
        animate={{ scale: 1.5, opacity: 0 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut", delay: 0.2 }}
        className={`absolute inset-0 rounded-full bg-${color}`}
      />
    </>
  );
}

// ============================================
// PAGE TRANSITION WRAPPER
// ============================================

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
