import React from "react";
export { alpha, useTheme } from "./ui.jsx";
export const createTheme = (opts) => opts || {};
export const ThemeProvider = ({ children }) => <>{children}</>;
export const styled = (Component) => () =>
  React.forwardRef((props, ref) => <Component ref={ref} {...props} />);
export default {};
