import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaUser, FaEnvelope, FaLock, FaUserTag } from "react-icons/fa";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/register`,
        {
          username,
          email,
          password,
          role,
        },
        { withCredentials: true }
      );
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <div className="card w-full max-w-lg fade-in">
        <h2 className="text-4xl font-bold text-center mb-8 text-[var(--text)]">
          Create Account
        </h2>
        {error && (
          <p className="text-[var(--accent)] bg-red-100 p-4 rounded-lg mb-8 text-center font-medium">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-6 relative">
            <label className="block text-[var(--text)] font-medium mb-2">
              Username
            </label>
            <div className="flex items-center border rounded-lg">
              <FaUser className="ml-3 text-[var(--text-light)]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 pl-10 border-none rounded-lg focus:ring-2 focus:ring-[var(--primary)]"
                required
                placeholder="Enter username"
              />
            </div>
          </div>
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
          <div className="mb-6 relative">
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
          <div className="mb-8 relative">
            <label className="block text-[var(--text)] font-medium mb-2">
              Role
            </label>
            <div className="flex items-center border rounded-lg">
              <FaUserTag className="ml-3 text-[var(--text-light)]" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3 pl-10 border-none rounded-lg focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="patient">Patient</option>
                <option value="dentist">Dentist</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-[var(--primary)] text-white p-3 rounded-lg hover:bg-blue-700 transition-all duration-300 font-medium"
          >
            Register
          </button>
        </form>
        <p className="mt-6 text-center text-[var(--text-light)]">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-[var(--primary)] hover:underline font-medium"
          >
            Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;
