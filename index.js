require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");

const port = process.env.PORT || 3000;

// Initialize Firebase Admin
if (process.env.FB_SERVICE_KEY) {
  const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
    "utf-8"
  );
  const serviceAccount = JSON.parse(decoded);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin initialized.");
} else {
  console.log("FB_SERVICE_KEY not found in .env");
}

const app = express();

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
    optionSuccessStatus: 200,
  })
);
app.use(express.json());

// JWT middleware
const verifyJWT = async (req, res, next) => {
  const token = req.headers?.authorization?.split(" ")[1];
  if (!token) return res.status(401).send({ message: "Unauthorized Access!" });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.tokenEmail = decoded.email;
    console.log("Decoded JWT:", decoded);
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err);
    return res.status(401).send({ message: "Unauthorized Access!", err });
  }
};

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
async function run() {
  try {
    const db = client.db("clubSphereDB");
    const usersconllections = db.collection("users");
    const clubcollections = db.collection("clubs");
    const membershipCollections = db.collection("memberships");

    //all club
    app.get("/clubs", async (req, res) => {
      const result = await clubcollections.find().toArray();
      res.send(result);
    });
    //get a club
    app.get("/clubs/:id", async (req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await clubcollections.findOne({ _id: id });
      res.send(result);
    });
    app.post("/club", async (req, res) => {
      const clubinfo = req.body;
      const result = await clubcollections.insertOne(clubinfo);
      res.send(result);
    });



    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
  }
}
run().catch(console.error);

app.get("/", (req, res) => {
  res.send("Hello from Server..");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});