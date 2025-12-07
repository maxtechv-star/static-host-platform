import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiMail, FiCheck, FiX, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';

export default function VerifyEmail() {
  const router = useRouter();
  const { token, email } = router.query;
  const [verificationStatus, setVerificationStatus] = useState('pending'); // pending, verifying, success, error
  const [message, setMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // If token is provided in URL, verify immediately
    if (token) {
      verifyEmailToken(token);
    }
  }, [token]);

  useEffect(() => {
    // Countdown timer for resend button
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const verifyEmailToken = async (verificationToken) => {
    setVerificationStatus('verifying');
    
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        
        // Update local storage if user is logged in
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          user.emailVerified = true;
          localStorage.setItem('user', JSON.stringify(user));
        }
        
        // Redirect to dashboard after delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setVerificationStatus('error');
        setMessage(data.error || 'Verification failed. The link may have expired.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('error');
      setMessage('Network error. Please check your connection.');
    }
  };

  const handleResendVerification = async () => {
    if (countdown > 0 || resendLoading) return;
    
    const userEmail = email || localStorage.getItem('pendingVerificationEmail');
    if (!userEmail) {
      setMessage('Email not found. Please try registering again.');
      return;
    }

    setResendLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendSuccess(true);
        setMessage('Verification email resent! Please check your inbox.');
        setCountdown(60); // 60 second cooldown
        
        setTimeout(() => {
          setResendSuccess(false);
        }, 5000);
      } else {
        setMessage(data.error || 'Failed to resend verification email.');
      }
    } catch (error) {
      console.error('Resend error:', error);
      setMessage('Network error. Please check your connection.');
    } finally {
      setResendLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'success':
        return <FiCheck className="w-16 h-16 text-green-500" />;
      case 'error':
        return <FiX className="w-16 h-16 text-red-500" />;
      case 'verifying':
        return (
          <svg className="animate-spin w-16 h-16 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      default:
        return <FiMail className="w-16 h-16 text-primary-600" />;
    }
  };

  const getStatusTitle = () => {
    switch (verificationStatus) {
      case 'success':
        return 'Email Verified!';
      case 'error':
        return 'Verification Failed';
      case 'verifying':
        return 'Verifying Email...';
      default:
        return 'Verify Your Email';
    }
  };

  const getStatusDescription = () => {
    switch (verificationStatus) {
      case 'success':
        return 'Your email has been successfully verified. You will be redirected to your dashboard shortly.';
      case 'error':
        return 'Unable to verify your email. The verification link may have expired or is invalid.';
      case 'verifying':
        return 'Please wait while we verify your email address...';
      default:
        return 'Please check your email for the verification link we sent you.';
    }
  };

  const displayEmail = email || localStorage.getItem('pendingVerificationEmail') || 'your email';

  return (
    <>
      <Head>
        <title>Verify Email - StaticHost</title>
        <meta name="description" content="Verify your email address for StaticHost" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and Brand */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary-600 to-cyan-600 flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              StaticHost
            </Link>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Free static site hosting by VeronDev
            </p>
          </div>

          {/* Verification Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              {/* Status Icon */}
              <div className="flex justify-center mb-6">
                <div className={`p-4 rounded-2xl ${
                  verificationStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
                  verificationStatus === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
                  verificationStatus === 'verifying' ? 'bg-primary-50 dark:bg-primary-900/20' :
                  'bg-gray-50 dark:bg-gray-700'
                }`}>
                  {getStatusIcon()}
                </div>
              </div>

              {/* Status Title */}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {getStatusTitle()}
              </h1>

              {/* Status Description */}
              <p className="text-gray-600 dark:text-gray-400">
                {getStatusDescription()}
              </p>

              {/* Email Display */}
              {verificationStatus === 'pending' && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
                    <FiMail className="w-5 h-5" />
                    <span className="font-medium">{displayEmail}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Message Display */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                verificationStatus === 'success' || resendSuccess
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}>
                <div className="flex items-center gap-3">
                  <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{message}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-4">
              {verificationStatus === 'pending' && (
                <>
                  <button
                    onClick={handleResendVerification}
                    disabled={resendLoading || countdown > 0}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-primary-600 dark:border-primary-500 text-primary-600 dark:text-primary-400 font-medium rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {resendLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiRefreshCw className="w-5 h-5" />
                        {countdown > 0 ? `Resend available in ${countdown}s` : 'Resend verification email'}
                      </>
                    )}
                  </button>

                  <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Didn't receive the email? Check your spam folder or{' '}
                    <button
                      onClick={handleResendVerification}
                      disabled={countdown > 0}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium disabled:opacity-50"
                    >
                      click here to resend
                    </button>
                  </div>
                </>
              )}

              {verificationStatus === 'error' && (
                <div className="space-y-3">
                  <button
                    onClick={handleResendVerification}
                    disabled={resendLoading || countdown > 0}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiRefreshCw className="w-5 h-5" />
                    {countdown > 0 ? `Resend available in ${countdown}s` : 'Send new verification link'}
                  </button>
                  
                  <Link
                    href="/auth/login"
                    className="block w-full text-center px-4 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                  >
                    Back to login
                  </Link>
                </div>
              )}

              {verificationStatus === 'success' && (
                <div className="space-y-3">
                  <Link
                    href="/dashboard"
                    className="block w-full text-center px-4 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white font-medium rounded-xl hover:from-primary-700 hover:to-cyan-700 transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                  
                  <Link
                    href="/dashboard/sites/create"
                    className="block w-full text-center px-4 py-3 border-2 border-primary-600 dark:border-primary-500 text-primary-600 dark:text-primary-400 font-medium rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  >
                    Create Your First Site
                  </Link>
                </div>
              )}

              {verificationStatus === 'pending' && (
                <Link
                  href="/auth/login"
                  className="block w-full text-center px-4 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                >
                  Back to login
                </Link>
              )}
            </div>

            {/* Platform Info */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Platform by{' '}
                  <a 
                    href="https://github.com/VeronDev" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 transition-colors"
                  >
                    VeronDev
                  </a>
                  {' • '}
                  <Link href="/" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 transition-colors">
                    Back to home
                  </Link>
                </p>
              </div>
            </div>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Need help?</p>
                  <p>If you're having trouble verifying your email, please contact support at <span className="font-medium">verondev@example.com</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}