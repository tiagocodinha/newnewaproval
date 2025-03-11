import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthContextType {
  session: Session | null;
  profile: any | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
  }

  async function signIn(email: string, password: string) {
    const RECAPTCHA_SITE_KEY = "6LeYnfEqAAAAAPEXq1ju-2NEDO5jNdVS7pmUfsvz"; // Substituir pela tua chave pública
    const RECAPTCHA_VERIFY_URL = "https://www.approval.stagelink.pt/api/verify-recaptcha"; // URL do endpoint backend

    if (!window.grecaptcha) {
      throw new Error("reCAPTCHA não foi carregado corretamente.");
    }

    try {
      // Executar o reCAPTCHA e obter um token
      const token = await window.grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action: "login" });

      // Enviar o token para validação no backend
      const recaptchaResponse = await fetch(RECAPTCHA_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const recaptchaData = await recaptchaResponse.json();

      if (!recaptchaData.success || recaptchaData.score < 0.5) {
        throw new Error("Falha na verificação do reCAPTCHA. Tente novamente.");
      }

      // Se reCAPTCHA for válido, proceder com login
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || "Erro ao efetuar login.");
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ session, profile, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
