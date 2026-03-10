import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // Estado mantido apenas em memória — sem localStorage para evitar exposição de dados via XSS
    const [usuario, setUsuario] = useState(null);
    const [loading, setLoading] = useState(true);

    // Valida cookie junto ao servidor — se válido, atualiza dados do usuário
    const verificarSessao = useCallback(async () => {
        try {
            const { data } = await authAPI.me();
            const usuarioAtualizado = data.usuario.igreja ? data.usuario : { ...data.usuario, ...(data.igreja ? { igreja: data.igreja } : {}) };
            setUsuario(usuarioAtualizado);
        } catch {
            // Cookie ausente ou expirado
            setUsuario(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        verificarSessao();
    }, [verificarSessao]);

    const login = async (email, senha) => {
        const { data } = await authAPI.login({ email, senha });
        // O backend seta o cookie httpOnly; guardamos os dados apenas em memória
        setUsuario(data.usuario);
        return data;
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch {
            // ignora falha de rede; cookie será limpo pelo servidor quando expirar
        }
        setUsuario(null);
        window.location.href = "/login";
    };

    return (
        <AuthContext.Provider value={{ usuario, loading, login, logout, isAuthenticated: !!usuario, verificarSessao }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
    return ctx;
}
