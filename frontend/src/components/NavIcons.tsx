type IconProps = {
  size?: number;
  className?: string;
};

/** Folded map with route — app brand mark */
export function AppMark({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 9 L16 5 L27 9 L27 23 L16 27 L5 23 Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M16 5 V27"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.35"
      />
      <path
        d="M9 12 C12 11 14 13 16 12 C18 11 20 13 23 12"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
      <path
        d="M8 18 H24 M10 22 H22"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
      <circle cx="11" cy="16" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="21" cy="15" r="2" fill="currentColor" opacity="0.5" />
      <path
        d="M11 16 L16 12 L21 15"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path
        d="M16 10 L16 7.5 M16 7.5 L14.5 6.5 M16 7.5 L17.5 6.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="16" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function RoutePin({ size = 14, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** HW graph — bold nodes & edges for visibility */
export function GraphNodes({ size = 14, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 19 L12 5 L19 19 M8 14 H16"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="19" r="3" fill="currentColor" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="5" r="3" fill="currentColor" stroke="currentColor" strokeWidth="1" />
      <circle cx="19" cy="19" r="3" fill="currentColor" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function GridMap({ size = 14, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="7" height="7" rx="1.5" opacity="0.7" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" opacity="0.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" opacity="0.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" opacity="0.7" />
    </svg>
  );
}
