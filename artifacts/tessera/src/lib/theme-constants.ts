export const FONT_COLORS = [
  { label: "Cyber Cyan", value: "#22d3ee", bg: "#22d3ee" },
  { label: "Sovereign Green", value: "#4ade80", bg: "#4ade80" },
  { label: "Rose Gold", value: "#fb7185", bg: "#fb7185" },
  { label: "Amber", value: "#fbbf24", bg: "#fbbf24" },
  { label: "Violet", value: "#a78bfa", bg: "#a78bfa" },
  { label: "Pure White", value: "#f1f5f9", bg: "#f1f5f9" },
  { label: "Orange", value: "#fb923c", bg: "#fb923c" },
  { label: "Emerald", value: "#34d399", bg: "#34d399" },
] as const;

export const ACCENT_COLORS = [
  { label: "Cyan", value: "cyan", color: "#22d3ee", hsl: "191 97% 50%" },
  { label: "Purple", value: "purple", color: "#a855f7", hsl: "270 91% 65%" },
  { label: "Rose", value: "rose", color: "#f43f5e", hsl: "350 89% 60%" },
  { label: "Green", value: "green", color: "#22c55e", hsl: "142 71% 45%" },
  { label: "Amber", value: "amber", color: "#f59e0b", hsl: "38 92% 50%" },
  { label: "Blue", value: "blue", color: "#3b82f6", hsl: "217 91% 60%" },
  { label: "Indigo", value: "indigo", color: "#6366f1", hsl: "239 84% 67%" },
  { label: "Teal", value: "teal", color: "#14b8a6", hsl: "173 80% 40%" },
] as const;

export const PARTICLE_COLORS = [
  "#06b6d4", "#8b5cf6", "#a78bfa", "#22d3ee", "#f59e0b",
  "#c4b5fd", "#67e8f9", "#818cf8", "#fb7185",
];

export const STAR_COLORS = [
  "#ffffff", "#e0f2fe", "#ddd6fe", "#fef9c3", "#d1fae5", "#fce7f3",
];

export function applyTheme(accentValue?: string) {
  const html = document.documentElement;
  html.classList.remove("light");
  html.classList.add("dark");

  const accent = ACCENT_COLORS.find(a => a.value === accentValue) || ACCENT_COLORS[0];
  const hslParts = accent.hsl.split(" ");
  const hue = parseInt(hslParts[0]);

  const accentCss = [
    `--primary: ${accent.hsl}`,
    `--primary-foreground: 255 20% 8%`,
    `--ring: ${accent.hsl}`,
    `--input: ${hue} 14% 22%`,
    `--sidebar-primary: ${accent.hsl}`,
    `--sidebar-ring: ${accent.hsl}`,
    `--sidebar-accent: ${hue} 18% 12%`,
    `--chart-1: ${accent.hsl}`,
    `--accent: ${hue} 20% 20%`,
  ].join("; ") + ";";

  let style = document.getElementById("tessera-theme-vars") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "tessera-theme-vars";
    document.head.appendChild(style);
  }

  style.textContent = `:root { ${accentCss} }`;
}

export function handleFontColorChange(currentColor: string, newColor: string): string {
  const next = currentColor === newColor ? "" : newColor;
  if (next) localStorage.setItem("tessera-font-color", next);
  else localStorage.removeItem("tessera-font-color");
  window.dispatchEvent(new Event("tessera-font-color-change"));
  return next;
}

export function handleThemeChange(accent: string) {
  localStorage.setItem("tessera-accent", accent);
  applyTheme(accent);
  window.dispatchEvent(new Event("tessera-theme-change"));
}
