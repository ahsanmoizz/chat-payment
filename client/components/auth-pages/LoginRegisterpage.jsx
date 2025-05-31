// client/components/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OTPLogin from './PhoneNo';
import Email2FA from './Email2FA';

const LoginRegisterPage = () => {
  // 'action' can be 'login' or 'register'
  const [action, setAction] = useState('login');
  // 'method' can be 'otp' or 'email'
  const [method, setMethod] = useState('otp');
  const navigate = useNavigate();

  const handleAuthSuccess = (token) => {
    navigate('/chat');
  };

 return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] p-6">
    <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl rounded-3xl p-8 text-white animate-fade-in">
      <h2 className="text-3xl font-bold text-center mb-6 tracking-wide">
        {action === 'login' ? '🔐 Login to WhatsApp' : '📝 Register on WhatsApp'}
      </h2>

      {/* Toggle Login/Register */}
      <div className="flex justify-center mb-4 space-x-4">
        {['login', 'register'].map((mode) => (
          <button
            key={mode}
            onClick={() => setAction(mode)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              action === mode
                ? 'bg-pink-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {mode === 'login' ? 'Login' : 'Register'}
          </button>
        ))}
      </div>

      {/* Toggle Method */}
      <div className="flex justify-center mb-6 space-x-4">
        <button
          onClick={() => setMethod('otp')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            method === 'otp'
              ? 'bg-green-500 text-white'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {action === 'login' ? 'Phone Login' : 'Phone Register'}
        </button>
        <button
          onClick={() => setMethod('email')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            method === 'email'
              ? 'bg-blue-500 text-white'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {action === 'login' ? 'Email Login' : 'Email Register'}
        </button>
      </div>

      {/* Dynamic Auth UI */}
      {method === 'otp' ? (
        <OTPLogin action={action} onAuthSuccess={handleAuthSuccess} />
      ) : (
        <Email2FA action={action} onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  </div>
);

};

export default LoginRegisterPage;
