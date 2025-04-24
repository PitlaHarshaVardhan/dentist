import { createContext, useState, useEffect } from "react";
import axios from "axios";
import Cookie from "js-cookie";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = Cookie.get("jwt_token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({
          userId: decoded.userId,
          role: decoded.role,
          username: decoded.username,
        });
      } catch (err) {
        console.error("Invalid token:", err);
        Cookie.remove("jwt_token");
      }
    }
  }, []);

  const login = async (email, password) => {
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL}/login`,
      { email, password },
      { withCredentials: true }
    );
    const { userId, role } = response.data;
    const token = Cookie.get("jwt_token");
    if (token) {
      const decoded = jwtDecode(token);
      setUser({ userId, role, username: decoded.username });
      return { role };
    }
    throw new Error("Login failed: No token received");
  };

  const logout = () => {
    axios.post(
      `${process.env.REACT_APP_API_URL}/logout`,
      {},
      { withCredentials: true }
    );
    Cookie.remove("jwt_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
