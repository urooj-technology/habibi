import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { setupAuthInterceptors } from "./api/authSession";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isBetween from "dayjs/plugin/isBetween";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Catch expired / deleted API tokens before any page request runs.
setupAuthInterceptors();

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

const root = ReactDOM.createRoot(document.getElementById("root"));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 50000,
      staleTime: 5000,
      gcTime: 10000,
    },
  },
});

root.render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
    <ToastContainer />
  </React.StrictMode>
);
