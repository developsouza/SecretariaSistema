import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { superadminAPI } from "../services/api";

const SuperAdminContext = createContext(null);

export function SuperAdminProvider({ children }) {
    const [superadmin, setSuperadmin] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("ss_superadmin") || "null");
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    const verificarSessao = useCallback(async () => {
        try {
            const { data } = await superadminAPI.me();
            setSuperadmin(data.superadmin);
            localStorage.setItem("ss_superadmin", JSON.stringify(data.superadmin));
        } catch {
            localStorage.removeItem("ss_superadmin");
            setSuperadmin(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Só chama a API se há dados no localStorage para validar — evita 401 desnecessário no console
        const stored = localStorage.getItem("ss_superadmin");
        if (stored && stored !== "null") {
            verificarSessao();
        } else {
            setLoading(false);
        }
    }, [verificarSessao]);

    const login = async (email, senha) => {
        const { data } = await superadminAPI.login({ email, senha });
        localStorage.setItem("ss_superadmin", JSON.stringify(data.superadmin));
        setSuperadmin(data.superadmin);
        return data;
    };

    const logout = async () => {
        try {
            await superadminAPI.logout();
        } catch {
            /* ignora */
        }
        localStorage.removeItem("ss_superadmin");
        setSuperadmin(null);
        window.location.href = "/super-admin/login";
    };

    return (
        <SuperAdminContext.Provider value={{ superadmin, loading, login, logout, isAuthenticated: !!superadmin, verificarSessao }}>
            {children}
        </SuperAdminContext.Provider>
    );
}

export function useSuperAdmin() {
    const ctx = useContext(SuperAdminContext);
    if (!ctx) throw new Error("useSuperAdmin deve ser usado dentro de SuperAdminProvider");
    return ctx;
}
