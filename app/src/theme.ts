import type { ReportStatus } from "./types/status";

// Central design tokens for the app. Keep colors/spacing here so screens stay consistent.

export const colors = {
  primary: "#0F8A4C",
  primaryDark: "#0A5D34",
  primarySoft: "#E6F7EE",

  background: "#F5F8F5",
  card: "#FFFFFF",
  border: "#DDE5DF",

  text: "#102016",
  textMuted: "#66707A",
  textOnPrimary: "#FFFFFF",

  danger: "#DC2626",
  dangerSoft: "#FDECEC",
  white: "#FFFFFF",

  // Report status palette
  pending: "#D97706",
  pendingSoft: "#FEF2CC",
  inProgress: "#2563EB",
  inProgressSoft: "#DBEAFE",
  resolved: "#0F8A4C",
  resolvedSoft: "#E6F7EE",
  rejected: "#DC2626",
  rejectedSoft: "#FDECEC",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typography = {
  screenTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  supporting: {
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
} as const;

export const shadow = {
  card: {
    shadowColor: "#102016",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
};

export type StatusKey = ReportStatus;

export function statusStyle(status: ReportStatus | "NO_GARBAGE") {
  switch (status) {
    case "NO_GARBAGE":
      return {
        fg: colors.textMuted,
        bg: colors.border,
        label: "No garbage",
        icon: "close-circle-outline" as const,
      };
    case "RESOLVED":
      return {
        fg: colors.resolved,
        bg: colors.resolvedSoft,
        label: "Resolved",
        icon: "checkmark-circle" as const,
      };
    case "IN_PROGRESS":
      return {
        fg: colors.inProgress,
        bg: colors.inProgressSoft,
        label: "In Progress",
        icon: "sync-circle" as const,
      };
    case "REJECTED":
      return {
        fg: colors.rejected,
        bg: colors.rejectedSoft,
        label: "Rejected",
        icon: "close-circle" as const,
      };
    default:
      return {
        fg: colors.pending,
        bg: colors.pendingSoft,
        label: "Pending",
        icon: "time" as const,
      };
  }
}

// Maps a 0..1 model confidence to a color + label band.
export function confidenceStyle(value: number) {
  const pct = Math.round(value * 100);
  if (value >= 0.7) {
    return { fg: colors.resolved, bg: colors.resolvedSoft, label: "High", pct };
  }
  if (value >= 0.4) {
    return { fg: colors.pending, bg: colors.pendingSoft, label: "Medium", pct };
  }
  return { fg: colors.danger, bg: colors.dangerSoft, label: "Low", pct };
}
