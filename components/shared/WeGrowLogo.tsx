import React from "react";
import Image from "next/image";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeGrowLogoProps {
  collapsed?: boolean;
  theme?: "dark" | "light";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const WeGrowLogo: React.FC<WeGrowLogoProps> = ({
  collapsed = false,
  className,
  size = "md",
}) => {
  if (collapsed) {
    return (
      <div className={cn("flex items-center justify-center select-none", className)}>
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20">
          <Briefcase className="w-5 h-5 text-white stroke-[2.2]" />
        </div>
      </div>
    );
  }

  const heightClasses = {
    sm: "h-7",
    md: "h-9",
    lg: "h-12",
  };

  return (
    <div className={cn("flex items-center select-none", className)}>
      <div className={cn("relative flex items-center", heightClasses[size])}>
        <img
          src="/logo.png"
          alt="WeGrow Jobz Logo"
          className="h-full w-auto object-contain max-h-12"
          onError={(e) => {
            // Fallback text if image cannot be rendered
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      </div>
    </div>
  );
};
