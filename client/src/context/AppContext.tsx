import type { AxiosInstance } from "axios";
import axios from "axios";
import { createContext, useContext, useState, useEffect } from "react";

interface User {
    id: string;
    name: string;
    email: string;
    plan: string;
    analysiscount?: number;
}

interface AppContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    api: AxiosInstance;
    login: (email: string, password: string) => Promise<{ success: boolean, message?: string }>;
    register: (name: string, email: string, password: string) => Promise<{ success: boolean, message?: string }>;
    logout: () => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    // axios instance with auth header
    const api = axios.create({
        baseURL: BACKEND_URL,
    });

    // update axios headers when token changes
    api.interceptors.request.use((config) => {
        const currentToken = localStorage.getItem("token");
        if (currentToken) {
            config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
    });

    // load user data when token changes
    const loadUser = async () => {
        const currentToken = localStorage.getItem("token");
        if (!currentToken) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const response = await api.get("/api/auth/user");
            if (response.data.success) {
                setUser(response.data.user);
            }
        } catch (error) {
            console.error("Failed to load user:", error);
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    // load user on mount and when token changes
    useEffect(() => {
        loadUser();
    }, [token]);

    const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await api.post("/api/auth/login", { email, password });
            
            if (response.data.success) {
                const { token: newToken, user: userData } = response.data;
                localStorage.setItem("token", newToken);
                setToken(newToken);
                setUser(userData);
                return { success: true, message: "Login successful" };
            }
            return { success: false, message: "Login failed" };
        } catch (error: any) {
            return { 
                success: false, 
                message: error.response?.data?.message || "Login failed. Please try again." 
            };
        }
    };

    const register = async (name: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await api.post("/api/auth/register", { name, email, password });
            
            if (response.data.success) {
                const { token: newToken, user: userData } = response.data;
                localStorage.setItem("token", newToken);
                setToken(newToken);
                setUser(userData);
                return { success: true, message: "Registration successful" };
            }
            return { success: false, message: "Registration failed" };
        } catch (error: any) {
            return { 
                success: false, 
                message: error.response?.data?.message || "Registration failed. Please try again." 
            };
        }
    };

    const logout = async (): Promise<void> => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    const value = { user, token, loading, api, login, register, logout };
    
    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error("useApp must be used within AppProvider");
    return context;
}