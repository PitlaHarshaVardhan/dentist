const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const PDFDocument = require("pdfkit");
const winston = require("winston");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// Logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console(),
  ],
});

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// S3 Configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Only JPEG/PNG images allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    ssl: true,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => logger.info("Connected to MongoDB Atlas"))
  .catch((err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
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
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  dentistId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["pending", "completed"], default: "pending" },
  images: [{ url: String, description: String }],
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Checkup = mongoose.model("Checkup", checkupSchema);

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
    logger.info(`User registered: ${email}`);
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    logger.error(`Registration error for ${email}: ${err.message}`);
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
      { userId: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET || "dental_checkup_secret",
      { expiresIn: "1h" }
    );
    res.cookie("jwt_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 3600000,
    });
    logger.info(`User logged in: ${email}`);
    res.json({
      message: "Login successful",
      userId: user._id,
      role: user.role,
    });
  } catch (err) {
    logger.error(`Login error for ${email}: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
});

// Logout Endpoint
app.post("/logout", (req, res) => {
  res.cookie("jwt_token", "", { httpOnly: true, expires: new Date(0) });
  logger.info("User logged out");
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
    logger.error(`Fetch dentists error: ${err.message}`);
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
    logger.info(`Checkup requested by user ${req.user.userId}`);
    res.json({ message: "Checkup requested" });
  } catch (err) {
    logger.error(`Checkup request error: ${err.message}`);
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
    logger.error(`Fetch patient checkups error: ${err.message}`);
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
    logger.error(`Fetch dentist checkups error: ${err.message}`);
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

      const images = [];
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const key = `checkups/${id}/${uuidv4()}${path.extname(
          file.originalname
        )}`;
        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        );
        images.push({
          url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
          description: descriptionArray[i] || "",
        });
      }

      checkup.images.push(...images);
      checkup.status = "completed";
      await checkup.save();
      logger.info(`Images uploaded for checkup ${id}`);
      res.json({ message: "Images uploaded" });
    } catch (err) {
      logger.error(`Upload images error for checkup ${id}: ${err.message}`);
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
      .text(`Dentist: ${checkup.dentistId?.username || "Unknown"}`)
      .moveDown();
    pdfDoc
      .text(`Date: ${new Date(checkup.createdAt).toLocaleDateString()}`)
      .moveDown();

    for (const [index, image] of checkup.images.entries()) {
      pdfDoc
        .text(`Image ${index + 1}: ${image.description || "No description"}`)
        .moveDown();
      const key = image.url.split(".com/")[1];
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
      });
      const { Body } = await s3.send(command);
      const buffer = await new Promise((resolve, reject) => {
        const chunks = [];
        Body.on("data", (chunk) => chunks.push(chunk));
        Body.on("error", reject);
        Body.on("end", () => resolve(Buffer.concat(chunks)));
      });
      pdfDoc.image(buffer, { width: 200 }).moveDown();
    }

    pdfDoc.end();
    logger.info(`PDF generated for checkup ${id}`);
  } catch (err) {
    logger.error(`Generate PDF error for checkup ${id}: ${err.message}`);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error(`Server error: ${err.message}`);
  res.status(500).json({ error: "Internal server error" });
});

// Start Server
app.listen(port, () => logger.info(`Server running on port ${port}`));
