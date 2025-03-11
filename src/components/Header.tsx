import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Header({ isAdmin = false }: { isAdmin?: boolean }) {
  const { signOut, profile } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <img 
          src="https://lrytvlsyuvctghzqsjic.supabase.co/storage/v1/object/public/logo//Stagelink-logotipo-black.png" 
          alt="Stagelink Logo" 
          className="h-12 object-contain"
        />
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {profile?.full_name || profile?.email}
          </h1>
          <p className="mt-2 text-gray-600">
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
  );  {/* Fechamento do return */}
}
