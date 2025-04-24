import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import PatientDashboard from "./components/PatientDashboard";
import DentistDashboard from "./components/DentistDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <header className="bg-[var(--card-bg)] shadow-md py-4 sticky top-0 z-10">
          <div className="container flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[var(--primary)]">
              Dental Care
            </h1>
          </div>
        </header>
        <main className="min-h-screen bg-[var(--background)]">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/patient"
              element={
                <ProtectedRoute role="patient">
                  <PatientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dentist"
              element={
                <ProtectedRoute role="dentist">
                  <DentistDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Login />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;
