import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const RECAPTCHA_SITE_KEY = "6LeYnfEqAAAAAPEXq1ju-2NEDO5jNdVS7pmUfsvz"; // TUA CHAVE PÚBLICA

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Carregar reCAPTCHA Enterprise
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!window.grecaptcha) {
      setError("reCAPTCHA not loaded.");
      return;
    }

    try {
      // Obter token do reCAPTCHA Enterprise
      const token = await window.grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action: "login" });

      // Enviar o token para validação no backend
      const recaptchaResponse = await fetch("https://www.approval.stagelink.pt/api/verify-recaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const recaptchaData = await recaptchaResponse.json();

      if (!recaptchaData.success) {
        setError("reCAPTCHA verification failed.");
        return;
      }

      // Se reCAPTCHA for válido, proceder com login
      await signIn(email, password);
      navigate("/");
    } catch (error: any) {
      setError(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center -mt-12 sm:-mt-20">
          <img
            src="https://lrytvlsyuvctghzqsjic.supabase.co/storage/v1/object/public/logo//Stagelink-logotipo-black.png"
            alt="Stagelink Logo"
            className="h-20 sm:h-28 mx-auto object-contain mb-4 sm:mb-6"
          />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
