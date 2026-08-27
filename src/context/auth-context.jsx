import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);
const AUTH_KEY = "sanjeet_logged_in";

export const AuthProvider = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState(
    () => localStorage.getItem(AUTH_KEY) === "1"
  );

  const login = () => {
    localStorage.setItem(AUTH_KEY, "1");
    setLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ loggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
