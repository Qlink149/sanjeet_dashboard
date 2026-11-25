import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);
const AUTH_KEY = "sanjeet_logged_in";
const TOKEN_KEY = "sanjeet_token";
const TOKEN_EXP_KEY = "sanjeet_token_exp";

export const AuthProvider = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState(
    () => localStorage.getItem(AUTH_KEY) === "1"
  );

  const login = (token, expiresAt) => {
    localStorage.setItem(AUTH_KEY, "1");
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (expiresAt) localStorage.setItem(TOKEN_EXP_KEY, String(expiresAt));
    setLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXP_KEY);
    setLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ loggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
