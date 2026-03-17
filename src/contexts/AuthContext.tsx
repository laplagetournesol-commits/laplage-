import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/shared/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/shared/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; hasSession: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) console.error('[AuthContext] fetchProfile error:', error);
    if (data) setProfile(data as Profile);
  };

  useEffect(() => {
    // Récupérer la session existante
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) fetchProfile(s.user.id);
      setIsLoading(false);
    });

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return {
      error: error ? new Error(error.message) : null,
      hasSession: !!data.session,
    };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signInWithApple = async (): Promise<{ error: Error | null }> => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { error: new Error('No identity token returned from Apple') };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        return { error: null }; // User cancelled
      }
      return { error: new Error(err.message ?? 'Apple sign-in failed') };
    }
  };

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    try {
      const redirectUri = AuthSession.makeRedirectUri();
      const nonce = Crypto.randomUUID();

      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      };

      const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
      if (!clientId) {
        return { error: new Error('Google Client ID not configured') };
      }

      const request = new AuthSession.AuthRequest({
        clientId,
        redirectUri,
        scopes: ['openid', 'email', 'profile'],
        responseType: AuthSession.ResponseType.IdToken,
        extraParams: { nonce },
      });

      const result = await request.promptAsync(discovery);

      if (result.type !== 'success' || !result.params.id_token) {
        if (result.type === 'cancel' || result.type === 'dismiss') {
          return { error: null }; // User cancelled
        }
        return { error: new Error('Google sign-in failed') };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: result.params.id_token,
        nonce,
      });

      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: new Error(err.message ?? 'Google sign-in failed') };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        isLoading,
        signUp,
        signIn,
        signInWithApple,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
