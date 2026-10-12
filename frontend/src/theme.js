/**
 * App theme tokens (Tailwind / CSS variables are the real source of styling).
 * Kept as a small helper so language direction can still flip the document.
 */
const createAppTheme = (direction = "ltr") => ({
  direction,
  palette: {
    mode: "light",
    primary: { main: "#635bff" },
    secondary: { main: "#2d3748" },
    error: { main: "#e5484d" },
    warning: { main: "#f5a524" },
    info: { main: "#0091ff" },
    success: { main: "#30a46c" },
    background: { default: "#f5f3ee", paper: "#ffffff" },
    text: { primary: "#1a202c", secondary: "#4a5568" },
    divider: "#e2e8f0",
  },
});

export { createAppTheme };
export default createAppTheme("ltr");
