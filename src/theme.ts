// Clean black-and-white look: big text, big buttons, few colours.
export const colors = {
  black: "#000000",
  white: "#FFFFFF",
  text: "#000000",
  textMuted: "#5E5E5E",
  textFaint: "#9A9A9A",
  border: "#E6E6E6",
  surface: "#F3F3F3",
  surfacePressed: "#E8E8E8",
  green: "#05944F",
  greenSoft: "#E6F4EC",
  red: "#D7263D",
  redSoft: "#FDECEE",
  amber: "#B7791F",
  amberSoft: "#FDF3E1",
  blue: "#276EF1",
  overlay: "rgba(0,0,0,0.45)",
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const font = {
  // Sizes are a bit larger than usual so everyone can read them easily.
  title: { fontSize: 28, fontWeight: "700" as const, color: colors.text },
  heading: { fontSize: 22, fontWeight: "700" as const, color: colors.text },
  subheading: { fontSize: 18, fontWeight: "600" as const, color: colors.text },
  body: { fontSize: 17, fontWeight: "400" as const, color: colors.text },
  bodyStrong: { fontSize: 17, fontWeight: "600" as const, color: colors.text },
  small: { fontSize: 15, fontWeight: "400" as const, color: colors.textMuted },
  tiny: { fontSize: 13, fontWeight: "500" as const, color: colors.textMuted },
  price: { fontSize: 32, fontWeight: "800" as const, color: colors.text },
};

export const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 4 },
  elevation: 8,
};
