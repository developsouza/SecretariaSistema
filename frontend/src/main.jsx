import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import "./styles/index.css";

const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <App />
                <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: "12px", fontSize: "14px" } }} />
            </AuthProvider>
        </QueryClientProvider>
    </React.StrictMode>,
);
