import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { FaEnvelope, FaLock } from "react-icons/fa";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { role } = await login(email, password);
      navigate(role === "patient" ? "/patient" : "/dentist");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <div className="card w-full max-w-lg fade-in">
        <h2 className="text-4xl font-bold text-center mb-8 text-[var(--text)]">
          Welcome Back
        </h2>
        {error && (
          <p className="text-[var(--accent)] bg-red-100 p-4 rounded-lg mb-8 text-center font-medium">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-6 relative">
            <label className="block text-[var(--text)] font-medium mb-2">
              Email
            </label>
            <div className="flex items-center border rounded-lg">
              <FaEnvelope className="ml-3 text-[var(--text-light)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 pl-10 border-none rounded-lg focus:ring-2 focus:ring-[var(--primary)]"
                required
                placeholder="Enter email"
              />
            </div>
          </div>
          <div className="mb-8 relative">
            <label className="block text-[var(--text)] font-medium mb-2">
              Password
            </label>
            <div className="flex items-center border rounded-lg">
              <FaLock className="ml-3 text-[var(--text-light)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 pl-10 border-none rounded-lg focus:ring-2 focus:ring-[var(--primary)]"
                required
                placeholder="Enter password"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-[var(--primary)] text-white p-3 rounded-lg hover:bg-blue-700 transition-all duration-300 font-medium"
          >
            Login
          </button>
        </form>
        <p className="mt-6 text-center text-[var(--text-light)]">
          Don't have an account?{" "}
          <a
            href="/register"
            className="text-[var(--primary)] hover:underline font-medium"
          >
            Register
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
