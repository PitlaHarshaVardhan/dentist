import { createContext, useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = Cookies.get("jwt_token");
    if (token) {
      axios
        .get("http://localhost:3001/checkups/patient", {
          withCredentials: true,
        })
        .then(() => setUser(JSON.parse(localStorage.getItem("user"))))
        .catch(() => {
          Cookies.remove("jwt_token");
          localStorage.removeItem("user");
        });
    }
  }, []);

  const login = async (email, password) => {
    const response = await axios.post(
      "http://localhost:3001/login",
      { email, password },
      { withCredentials: true }
    );
    setUser(response.data);
    localStorage.setItem("user", JSON.stringify(response.data));
    return response.data;
  };

  const logout = async () => {
    await axios.post(
      "http://localhost:3001/logout",
      {},
      { withCredentials: true }
    );
    Cookies.remove("jwt_token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
