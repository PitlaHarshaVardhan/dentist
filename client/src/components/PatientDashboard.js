import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

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
    <div className="min-h-screen bg-[var(--background)] py-8">
      <div className="container">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--text)]">
            Patient Dashboard
          </h1>
          <button
            onClick={logout}
            className="bg-[var(--accent)] text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-all duration-300"
          >
            Logout
          </button>
        </div>
        <div className="card fade-in">
          <h2 className="text-2xl font-semibold mb-6">Request Checkup</h2>
          <select
            value={selectedDentist}
            onChange={(e) => setSelectedDentist(e.target.value)}
            className="w-full p-3 border rounded-lg mb-6 focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="">Select Dentist</option>
            {dentists.map((dentist) => (
              <option key={dentist._id} value={dentist._id}>
                {dentist.username}
              </option>
            ))}
          </select>
          <button
            onClick={handleCheckupRequest}
            disabled={!selectedDentist}
            className="bg-[var(--primary)] text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:bg-gray-400"
          >
            Request Checkup
          </button>
        </div>
        <div className="card fade-in">
          <h2 className="text-2xl font-semibold mb-6">Your Checkups</h2>
          {checkups.length === 0 ? (
            <p className="text-[var(--text-light)]">No checkups found.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {checkups.map((checkup) => (
                <div
                  key={checkup._id}
                  className="border border-gray-200 p-6 rounded-lg hover:shadow-lg transition-all duration-300"
                >
                  <p className="text-lg">
                    <strong>Dentist:</strong>{" "}
                    {checkup.dentistId?.username || "Unknown"}
                  </p>
                  <p className="text-lg">
                    <strong>Status:</strong>{" "}
                    <span
                      className={
                        checkup.status === "completed"
                          ? "text-green-600"
                          : "text-yellow-600"
                      }
                    >
                      {checkup.status}
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {checkup.images.map((image, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 p-3 rounded-lg"
                          >
                            <img
                              src={`http://localhost:3001${image.url}`}
                              alt={`Checkup ${index}`}
                              className="w-full h-40 object-cover rounded-lg mb-2"
                            />
                            <p className="text-[var(--text-light)]">
                              {image.description || "No description"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {checkup.status === "completed" && (
                    <button
                      onClick={() => handleDownloadPDF(checkup._id)}
                      className="mt-4 bg-[var(--secondary)] text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-all duration-300 w-full"
                    >
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
