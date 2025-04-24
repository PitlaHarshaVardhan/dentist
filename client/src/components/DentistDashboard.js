import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { FaTooth, FaUpload, FaTimes } from "react-icons/fa";

const DentistDashboard = () => {
  const [checkups, setCheckups] = useState([]);
  const [selectedCheckup, setSelectedCheckup] = useState(null);
  const [images, setImages] = useState([]);
  const [descriptions, setDescriptions] = useState([]);
  const { logout, user } = useContext(AuthContext);

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/checkups/dentist`, {
        withCredentials: true,
      })
      .then((res) => setCheckups(res.data))
      .catch((err) => console.error("Fetch checkups error:", err));
  }, []);

  const handleImageChange = (e) => {
    setImages([...e.target.files]);
    setDescriptions(Array(e.target.files.length).fill(""));
  };

  const handleDescriptionChange = (index, value) => {
    const newDescriptions = [...descriptions];
    newDescriptions[index] = value;
    setDescriptions(newDescriptions);
  };

  const handleUpload = async () => {
    const formData = new FormData();
    images.forEach((image) => formData.append("images", image));
    descriptions.forEach((desc) => formData.append("descriptions", desc));
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/checkup/${selectedCheckup._id}/upload`,
        formData,
        { withCredentials: true }
      );
      setSelectedCheckup(null);
      setImages([]);
      setDescriptions([]);
      axios
        .get(`${process.env.REACT_APP_API_URL}/checkups/dentist`, {
          withCredentials: true,
        })
        .then((res) => setCheckups(res.data));
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-12">
      <div className="container">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <FaTooth className="text-[var(--primary)] text-4xl" />
            <h1 className="text-4xl font-bold text-[var(--text)]">
              Welcome, Dr. {user?.username || "Dentist"}
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
            Pending Checkups
          </h2>
          {checkups.length === 0 ? (
            <p className="text-[var(--text-light)] text-center">
              No pending checkups.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {checkups.map((checkup) => (
                <div
                  key={checkup._id}
                  className="border border-gray-200 p-6 rounded-lg hover:shadow-lg transition-all duration-300 bg-[var(--card-bg)]"
                >
                  <p className="text-lg font-medium">
                    <strong>Patient:</strong> {checkup.patientId.username}
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
                  <button
                    onClick={() => setSelectedCheckup(checkup)}
                    className="mt-4 bg-[var(--primary)] text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 w-full flex items-center justify-center gap-2"
                  >
                    <FaUpload />
                    Upload Results
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedCheckup && (
          <div className="card fade-in">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <FaTooth className="text-[var(--primary)]" />
              Upload Checkup Results
            </h2>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="mb-6 w-full text-[var(--text)] p-3 border rounded-lg"
            />
            {images.map((image, index) => (
              <div key={index} className="mb-6 bg-gray-50 p-4 rounded-lg">
                <p className="text-lg font-medium mb-2">
                  Image {index + 1} ({image.name})
                </p>
                <input
                  type="text"
                  value={descriptions[index]}
                  onChange={(e) =>
                    handleDescriptionChange(index, e.target.value)
                  }
                  placeholder="Enter description"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            ))}
            <div className="flex gap-4">
              <button
                onClick={handleUpload}
                disabled={images.length === 0}
                className="bg-[var(--secondary)] text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-all duration-300 disabled:bg-gray-400 flex items-center gap-2"
              >
                <FaUpload />
                Upload
              </button>
              <button
                onClick={() => setSelectedCheckup(null)}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-all duration-300 flex items-center gap-2"
              >
                <FaTimes />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DentistDashboard;
