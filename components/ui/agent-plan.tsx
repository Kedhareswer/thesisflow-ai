"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDotDashed,
  CircleX,
  Brain,
  FileText,
  Lightbulb,
  Search,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

// Type definitions
interface ThinkingStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  icon: React.ComponentType<{ className?: string }>;
  duration?: number;
}

interface AgentPlanProps {
  isVisible: boolean;
  onComplete?: () => void;
  className?: string;
}

// Default thinking steps for research assistant
const defaultThinkingSteps: ThinkingStep[] = [
  {
    id: "1",
    title: "Accessing Session",
    description: "Loading your research context and session data",
    status: "pending",
    icon: Brain,
    duration: 800,
  },
  {
    id: "2",
    title: "Reading Your Papers",
    description: "Analyzing selected papers and their content",
    status: "pending",
    icon: FileText,
    duration: 1200,
  },
  {
    id: "3",
    title: "Understanding Your Ideas",
    description: "Processing your saved research ideas and insights",
    status: "pending",
    icon: Lightbulb,
    duration: 1000,
  },
  {
    id: "4",
    title: "Searching Context",
    description: "Finding relevant information from your research",
    status: "pending",
    icon: Search,
    duration: 1500,
  },
  {
    id: "5",
    title: "Generating Response",
    description: "Creating a comprehensive answer based on your research",
    status: "pending",
    icon: MessageSquare,
    duration: 2000,
  },
];

export function AgentPlan({ isVisible, onComplete, className }: AgentPlanProps) {
  const [steps, setSteps] = useState<ThinkingStep[]>(defaultThinkingSteps);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Add support for reduced motion preference
  const prefersReducedMotion = 
    typeof window !== 'undefined' 
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
      : false;

  useEffect(() => {
    if (!isVisible) {
      setCurrentStepIndex(0);
      setSteps(defaultThinkingSteps.map(step => ({ ...step, status: "pending" })));
      return;
    }

    // Simulate the thinking process
    const runThinkingProcess = async () => {
      for (let i = 0; i < steps.length; i++) {
        // Start current step
        setCurrentStepIndex(i);
        setSteps(prev => prev.map((step, index) => 
          index === i ? { ...step, status: "in-progress" } : step
        ));

        // Wait for step duration
        await new Promise(resolve => setTimeout(resolve, steps[i].duration || 1000));

        // Complete current step
        setSteps(prev => prev.map((step, index) => 
          index === i ? { ...step, status: "completed" } : step
        ));

        // Small pause between steps
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Call completion callback
      if (onComplete) {
        setTimeout(onComplete, 500);
      }
    };

    runThinkingProcess();
  }, [isVisible, onComplete]);

  // Animation variants
  const containerVariants = {
    hidden: { 
      opacity: 0, 
      y: prefersReducedMotion ? 0 : 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.2, 0.65, 0.3, 0.9]
      }
    },
    exit: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : -20,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  const stepVariants = {
    hidden: { 
      opacity: 0, 
      x: prefersReducedMotion ? 0 : -10 
    },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: prefersReducedMotion ? "tween" : "spring",
        stiffness: 500,
        damping: 30,
        duration: prefersReducedMotion ? 0.2 : undefined
      }
    },
    exit: {
      opacity: 0,
      x: prefersReducedMotion ? 0 : 10,
      transition: { duration: 0.15 }
    }
  };

  const statusIconVariants = {
    initial: { scale: 1, rotate: 0 },
    animate: { 
      scale: prefersReducedMotion ? 1 : [1, 1.1, 1],
      rotate: prefersReducedMotion ? 0 : [0, 5, 0],
      transition: {
        duration: 0.3,
        ease: [0.34, 1.56, 0.64, 1]
      }
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className={`bg-card border-border rounded-lg border shadow-sm p-4 ${className || ''}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <LayoutGroup>
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              animate={{ 
                rotate: prefersReducedMotion ? 0 : [0, 360],
                scale: prefersReducedMotion ? 1 : [1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <Brain className="h-5 w-5 text-primary" />
            </motion.div>
            <span className="font-medium text-sm">AI is thinking...</span>
          </div>

          <div className="space-y-2">
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = step.status === "completed";
              const isInProgress = step.status === "in-progress";

              return (
                <motion.div
                  key={step.id}
                  className="flex items-center gap-3 p-2 rounded-md transition-colors"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  whileHover={{ 
                    backgroundColor: "rgba(0,0,0,0.02)",
                    transition: { duration: 0.2 }
                  }}
                >
                  {/* Status Icon */}
                  <motion.div
                    className="flex-shrink-0"
                    variants={statusIconVariants}
                    initial="initial"
                    animate={isInProgress ? "animate" : "initial"}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={step.status}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        {step.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : step.status === "in-progress" ? (
                          <CircleDotDashed className="h-4 w-4 text-blue-500" />
                        ) : step.status === "failed" ? (
                          <CircleX className="h-4 w-4 text-red-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>

                  {/* Step Icon */}
                  <div className="flex-shrink-0">
                    <step.icon className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        isCompleted ? "text-muted-foreground line-through" :
                        isInProgress ? "text-primary" :
                        "text-foreground"
                      }`}>
                        {step.title}
                      </span>
                      {isInProgress && (
                        <motion.div
                          className="flex gap-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-1 h-1 bg-current rounded-full"
                              animate={{
                                opacity: [0.3, 1, 0.3],
                                scale: [1, 1.2, 1]
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2
                              }}
                            />
                          ))}
                        </motion.div>
                      )}
                    </div>
                    <p className={`text-xs ${
                      isCompleted ? "text-muted-foreground" : "text-muted-foreground"
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </LayoutGroup>
    </motion.div>
  );
} 