import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Header({ isAdmin = false }: { isAdmin?: boolean }) {
  const { signOut, profile } = useAuth();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-center space-x-4 items-center">
        {/* Logo da Stagelink */}
        <img 
          src="https://lrytvlsyuvctghzqsjic.supabase.co/storage/v1/object/public/logo//Stagelink-logotipo-black.png" 
          alt="Stagelink Logo" 
          className="h-16 sm:h-20 object-contain"
        />

        {/* Barra vertical entre os logos */}
        {profile?.company_logo && (
          <div className="w-0.3 h-12 sm:h-16 bg-gray-490"></div>
        )}

        {/* Logo da Empresa do Usuário */}
        {profile?.company_logo && (
          <img 
            src={profile.company_logo} 
            alt="Company Logo" 
            className="h-12 sm:h-16 object-contain"
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome, {profile?.full_name || profile?.email}
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            {isAdmin ? 'Manage social media content' : 'Review and approve your social media content'}
          </p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center px-4 py-2 text-gray-700 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Log Out
        </button>
      </div>
    </div>
  );
}
