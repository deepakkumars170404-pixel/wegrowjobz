import React from "react";

interface StaffAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: number; // width & height in px, e.g. 36, 48, 64
  className?: string;
  ringColor?: string;
}

// Deterministic pleasing palette based on the staff member's name
const AVATAR_COLORS = [
  { bg: "bg-blue-600", text: "text-white" },
  { bg: "bg-indigo-600", text: "text-white" },
  { bg: "bg-emerald-600", text: "text-white" },
  { bg: "bg-amber-600", text: "text-white" },
  { bg: "bg-rose-600", text: "text-white" },
  { bg: "bg-purple-600", text: "text-white" },
  { bg: "bg-teal-600", text: "text-white" },
  { bg: "bg-cyan-600", text: "text-white" },
];

export function getAvatarColor(name: string) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export const StaffAvatar: React.FC<StaffAvatarProps> = ({
  name,
  avatarUrl,
  size = 40,
  className = "",
  ringColor = "",
}) => {
  const initial = (name || "S").trim().charAt(0).toUpperCase();
  const color = getAvatarColor(name);

  // If a valid custom photo exists (Base64 data:image or http)
  if (avatarUrl && avatarUrl.trim() && (avatarUrl.startsWith("http") || avatarUrl.startsWith("data:image"))) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shrink-0 ${ringColor} ${className}`}
      />
    );
  }

  // Default: Initial Letter Avatar with professional styling
  const fontSize = Math.max(12, Math.round(size * 0.42));

  return (
    <div
      style={{ width: size, height: size, fontSize }}
      className={`rounded-full flex items-center justify-center font-bold tracking-wider select-none shrink-0 shadow-xs ${color.bg} ${color.text} ${ringColor} ${className}`}
      title={name}
    >
      {initial}
    </div>
  );
};
