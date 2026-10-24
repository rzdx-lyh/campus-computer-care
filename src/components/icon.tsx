import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "activity"
  | "sparkles"
  | "plus"
  | "clipboard"
  | "wrench"
  | "chart"
  | "monitor"
  | "cpu"
  | "memory"
  | "wifi"
  | "battery"
  | "arrow-right"
  | "clock"
  | "building"
  | "shield"
  | "check"
  | "alert"
  | "upload"
  | "search"
  | "refresh"
  | "message"
  | "mic"
  | "volume"
  | "download"
  | "graph"
  | "lock"
  | "book"
  | "video"
  | "logout"
  | "database"
  | "cloud-upload";

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    activity: <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />,
    sparkles: (
      <>
        <path d="m12 3-1.2 3.8L7 8l3.8 1.2L12 13l1.2-3.8L17 8l-3.8-1.2z" />
        <path d="m5 15-.8 2.2L2 18l2.2.8L5 21l.8-2.2L8 18l-2.2-.8z" />
        <path d="m19 14-.6 1.4L17 16l1.4.6L19 18l.6-1.4L21 16l-1.4-.6z" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    clipboard: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4.5V3h6v1.5M9 9h6M9 13h6M9 17h4" />
      </>
    ),
    wrench: <path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.3 2.3-2.2-.1-.1-2.2z" />,
    chart: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
    monitor: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
    cpu: (
      <>
        <rect x="7" y="7" width="10" height="10" rx="2" />
        <path d="M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3" />
        <path d="M10 10h4v4h-4z" />
      </>
    ),
    memory: (
      <>
        <rect x="3" y="7" width="18" height="10" rx="2" />
        <path d="M7 10v4m4-4v4m4-4v4m4-4v4M6 17v3m4-3v3m4-3v3m4-3v3" />
      </>
    ),
    wifi: <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M2 9a15 15 0 0 1 20 0" />,
    battery: (
      <>
        <rect x="3" y="7" width="17" height="10" rx="2" />
        <path d="M20 10h2v4h-2M7 12.5h8" />
      </>
    ),
    "arrow-right": <path d="M5 12h14m-6-6 6 6-6 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    building: (
      <>
        <path d="M4 21V5l8-3v19M12 8h8v13M2 21h20" />
        <path d="M7 8h2m-2 4h2m-2 4h2m6-4h2m-2 4h2" />
      </>
    ),
    shield: <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6zM9 12l2 2 4-4" />,
    check: <path d="m5 12 4 4L19 6" />,
    alert: (
      <>
        <path d="M12 3 2.8 20h18.4z" />
        <path d="M12 9v5m0 3h.01" />
      </>
    ),
    upload: <path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 5 5" />
      </>
    ),
    refresh: <path d="M20 7v5h-5M4 17v-5h5M18.5 10A7 7 0 0 0 6 6.5L4 9m16 6-2 2.5A7 7 0 0 1 5.5 14" />,
    message: <path d="M21 12a8 8 0 0 1-8 8H6l-3 2 1-5a8 8 0 1 1 17-5z" />,
    mic: (
      <>
        <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
      </>
    ),
    volume: (
      <>
        <path d="M11 5 6 9H3v6h3l5 4z" />
        <path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />
      </>
    ),
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 21h16" />,
    graph: (
      <>
        <circle cx="12" cy="5" r="2.5" />
        <circle cx="5" cy="18" r="2.5" />
        <circle cx="19" cy="18" r="2.5" />
        <path d="m10.5 7-4 8.5M13.5 7l4 8.5M7.5 18h9" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    book: (
      <>
        <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
        <path d="M4 19a2 2 0 0 1 2-2h13v5H6a2 2 0 0 1-2-2z" />
        <path d="M9 7h7" />
      </>
    ),
    video: (
      <>
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="m16 10 5-3v10l-5-3z" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
        <path d="m16 17 5-5-5-5M21 12H9" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </>
    ),
    "cloud-upload": (
      <>
        <path d="M17 18a4 4 0 0 0 1.2-7.8A6 6 0 0 0 6.6 9.6 3.5 3.5 0 0 0 7 18z" />
        <path d="M12 12v6m-2.5-2.5L12 16l2.5-2.5" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

