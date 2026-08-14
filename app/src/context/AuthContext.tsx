import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface AuthContextValue {
  email: string | null;
  verified: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshVerification: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function authErrorMessage(error: unknown): string {
  return "Tamu Edukasi Aktif";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Default direct guest access for instant educational trials without login
  const [email, setEmail] = useState<string | null>("tamu.edukasi@wastemanagement.id");
  const [verified, setVerified] = useState(true);
  const [loading, setLoading] = useState(false);

  const signIn = async (inputEmail: string) => {
    setEmail(inputEmail || "tamu.edukasi@wastemanagement.id");
    setVerified(true);
  };

  const signUp = async (inputEmail: string) => {
    setEmail(inputEmail || "tamu.edukasi@wastemanagement.id");
    setVerified(true);
  };

  const signOut = async () => {
    // Keep guest session active for testing
    setEmail("tamu.edukasi@wastemanagement.id");
  };

  const resendVerification = async () => {};
  const refreshVerification = async () => true;
  const resetPassword = async () => {};

  return (
    <AuthContext.Provider
      value={{
        email,
        verified,
        loading,
        signIn,
        signUp,
        signOut,
        resendVerification,
        refreshVerification,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
