import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FaTooth, FaDownload } from "react-icons/fa";

const PatientDashboard = () => {
  const [dentists, setDentists] = useState([]);
  const [checkups, setCheckups] = useState([]);
  const [selectedDentist, setSelectedDentist] = useState("");
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:3001/dentists", { withCredentials: true })
      .then((res) => setDentists(res.data))
      .catch((err) => console.error("Fetch dentists error:", err));
    axios
      .get("http://localhost:3001/checkups/patient", { withCredentials: true })
      .then((res) => setCheckups(res.data))
      .catch((err) => console.error("Fetch checkups error:", err));
  }, []);

  const handleCheckupRequest = async () => {
    try {
      await axios.post(
        "http://localhost:3001/checkup",
        { dentistId: selectedDentist },
        { withCredentials: true }
      );
      axios
        .get("http://localhost:3001/checkups/patient", {
          withCredentials: true,
        })
        .then((res) => setCheckups(res.data));
      setSelectedDentist("");
    } catch (err) {
      console.error("Checkup request error:", err);
    }
  };

  const handleDownloadPDF = (checkupId) => {
    window.open(`http://localhost:3001/checkup/${checkupId}/pdf`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-12">
      <div className="container">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <FaTooth className="text-[var(--primary)] text-4xl" />
            <h1 className="text-4xl font-bold text-[var(--text)]">
              Welcome, {user?.username || "Patient"}
            </h1>
          </div>
          <button
            onClick={logout}
            className="bg-[var(--accent)] text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-all duration-300 flex items-center gap-2"
          >
            Logout
          </button>
        </div>
        <div className="card fade-in">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <FaTooth className="text-[var(--primary)]" />
            Request a Checkup
          </h2>
          <select
            value={selectedDentist}
            onChange={(e) => setSelectedDentist(e.target.value)}
            className="w-full p-3 border rounded-lg mb-6 focus:ring-2 focus:ring-[var(--primary)] bg-[var(--card-bg)]"
          >
            <option value="">Select a Dentist</option>
            {dentists.map((dentist) => (
              <option key={dentist._id} value={dentist._id}>
                {dentist.username}
              </option>
            ))}
          </select>
          <button
            onClick={handleCheckupRequest}
            disabled={!selectedDentist}
            className="bg-[var(--primary)] text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:bg-gray-400 w-full sm:w-auto"
          >
            Request Checkup
          </button>
        </div>
        <div className="card fade-in">
          <h2 className="text-2xl font-semibold mb-6">Your Checkups</h2>
          {checkups.length === 0 ? (
            <p className="text-[var(--text-light)] text-center">
              No checkups found. Request one above!
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {checkups.map((checkup) => (
                <div
                  key={checkup._id}
                  className="border border-gray-200 p-6 rounded-lg hover:shadow-lg transition-all duration-300 bg-[var(--card-bg)]"
                >
                  <p className="text-lg font-medium">
                    <strong>Dentist:</strong>{" "}
                    {checkup.dentistId?.username || "Unknown"}
                  </p>
                  <p className="text-lg">
                    <strong>Status:</strong>{" "}
                    <span
                      className={
                        checkup.status === "completed"
                          ? "text-green-600 font-medium"
                          : "text-yellow-600 font-medium"
                      }
                    >
                      {checkup.status.charAt(0).toUpperCase() +
                        checkup.status.slice(1)}
                    </span>
                  </p>
                  <p className="text-lg">
                    <strong>Date:</strong>{" "}
                    {new Date(checkup.createdAt).toLocaleDateString()}
                  </p>
                  {checkup.images.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold mb-2">
                        Images & Notes
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {checkup.images.map((image, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 p-3 rounded-lg bg-gray-50"
                          >
                            <img
                              src={`http://localhost:3001${image.url}`}
                              alt={`Checkup ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg mb-2"
                            />
                            <p className="text-[var(--text-light)] text-sm">
                              {image.description || "No description provided"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {checkup.status === "completed" && (
                    <button
                      onClick={() => handleDownloadPDF(checkup._id)}
                      className="mt-4 bg-[var(--secondary)] text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-all duration-300 w-full flex items-center justify-center gap-2"
                    >
                      <FaDownload />
                      Download PDF
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
