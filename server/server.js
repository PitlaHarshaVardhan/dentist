const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
require("dotenv").config(); // Add dotenv for environment variables

const app = express();
const port = 3001;

// Middleware
app.use(cors({ origin: "https://dentist-1.onrender.com", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
mongoose
  .connect(
    process.env.MONGO_URI ||
      "mongodb+srv://22h51a73b6:22h51a73b6harsha@cluster-1.uvwfoof.mongodb.net/dental?retryWrites=true&w=majority",
    {
      ssl: true,
      serverSelectionTimeoutMS: 5000,
    }
  )
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Schemas
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: { type: String, enum: ["patient", "dentist"], default: "patient" },
});

const checkupSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference User model
  dentistId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference User model
  status: { type: String, enum: ["pending", "completed"], default: "pending" },
  images: [{ url: String, description: String }],
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Checkup = mongoose.model("Checkup", checkupSchema);

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// JWT Verification Middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.jwt_token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  jwt.verify(
    token,
    process.env.JWT_SECRET || "dental_checkup_secret",
    (err, decoded) => {
      if (err) return res.status(401).json({ error: "Invalid Token" });
      req.user = decoded;
      next();
    }
  );
};

// Register Endpoint
app.post("/register", async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role)
    return res.status(400).json({ error: "All fields required" });
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "User already exists" });
    const user = new User({ username, email, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login Endpoint
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "dental_checkup_secret",
      { expiresIn: "1h" }
    );
    // Set JWT in cookie
    res.cookie("jwt_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Secure in production
      sameSite: "Strict", // Prevent CSRF
      maxAge: 3600000, // 1 hour in milliseconds
    });
    console.log("Cookie set:", { jwt_token: token }); // Debug cookie
    res.json({
      message: "Login successful",
      userId: user._id,
      role: user.role,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Logout Endpoint
app.post("/logout", (req, res) => {
  res.cookie("jwt_token", "", { httpOnly: true, expires: new Date(0) });
  res.json({ message: "Logged out" });
});

// Get Dentists Endpoint
app.get("/dentists", verifyToken, async (req, res) => {
  try {
    const dentists = await User.find({ role: "dentist" }).select(
      "username _id"
    );
    res.json(dentists);
  } catch (err) {
    console.error("Fetch dentists error:", err);
    res.status(500).json({ error: "Failed to fetch dentists" });
  }
});

// Request Checkup Endpoint
app.post("/checkup", verifyToken, async (req, res) => {
  const { dentistId } = req.body;
  if (!dentistId) return res.status(400).json({ error: "Dentist ID required" });
  try {
    const checkup = new Checkup({ patientId: req.user.userId, dentistId });
    await checkup.save();
    res.json({ message: "Checkup requested" });
  } catch (err) {
    console.error("Checkup request error:", err);
    res.status(500).json({ error: "Failed to request checkup" });
  }
});

// Get Patient Checkups Endpoint
app.get("/checkups/patient", verifyToken, async (req, res) => {
  try {
    const checkups = await Checkup.find({
      patientId: req.user.userId,
    }).populate("dentistId", "username");
    res.json(checkups);
  } catch (err) {
    console.error("Fetch patient checkups error:", err);
    res.status(500).json({ error: "Failed to fetch checkups" });
  }
});

// Get Dentist Checkups Endpoint
app.get("/checkups/dentist", verifyToken, async (req, res) => {
  if (req.user.role !== "dentist")
    return res.status(403).json({ error: "Unauthorized" });
  try {
    const checkups = await Checkup.find({
      dentistId: req.user.userId,
    }).populate("patientId", "username");
    res.json(checkups);
  } catch (err) {
    console.error("Fetch dentist checkups error:", err);
    res.status(500).json({ error: "Failed to fetch checkups" });
  }
});

// Upload Checkup Images Endpoint
app.post(
  "/checkup/:id/upload",
  verifyToken,
  upload.array("images", 5),
  async (req, res) => {
    if (req.user.role !== "dentist")
      return res.status(403).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { descriptions } = req.body;
    const descriptionArray = Array.isArray(descriptions)
      ? descriptions
      : [descriptions];
    try {
      const checkup = await Checkup.findById(id);
      if (!checkup || checkup.dentistId.toString() !== req.user.userId)
        return res.status(404).json({ error: "Checkup not found" });
      const images = req.files.map((file, index) => ({
        url: `/uploads/${file.filename}`,
        description: descriptionArray[index] || "",
      }));
      checkup.images.push(...images);
      checkup.status = "completed";
      await checkup.save();
      res.json({ message: "Images uploaded" });
    } catch (err) {
      console.error("Upload images error:", err);
      res.status(500).json({ error: "Failed to upload images" });
    }
  }
);

// Generate PDF Endpoint
app.get("/checkup/:id/pdf", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const checkup = await Checkup.findById(id).populate(
      "dentistId",
      "username"
    );
    if (!checkup || checkup.patientId.toString() !== req.user.userId)
      return res.status(404).json({ error: "Checkup not found" });

    // Debug populated data
    console.log("Populated checkup:", {
      checkupId: checkup._id,
      dentistId: checkup.dentistId?._id,
      dentistUsername: checkup.dentistId?.username,
    });

    const pdfDoc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=checkup_${id}.pdf`
    );
    pdfDoc.pipe(res);
    pdfDoc
      .fontSize(18)
      .text("Dental Checkup Report", { align: "center" })
      .moveDown();
    pdfDoc
      .fontSize(12)
      .text(`Dentist: ${checkup.dentistId?.username || "Unknown"}`) // Fallback if username is missing
      .moveDown();
    pdfDoc
      .text(`Date: ${new Date(checkup.createdAt).toLocaleDateString()}`)
      .moveDown();
    checkup.images.forEach((image, index) => {
      pdfDoc
        .text(`Image ${index + 1}: ${image.description || "No description"}`)
        .moveDown();
      pdfDoc
        .image(path.join(__dirname, image.url.slice(1)), { width: 200 })
        .moveDown();
    });
    pdfDoc.end();
  } catch (err) {
    console.error("Generate PDF error:", err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// Start Server
app.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`)
);
