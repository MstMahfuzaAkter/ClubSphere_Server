require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb')
const admin = require('firebase-admin')
const port = process.env.PORT || 3000
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString(
  'utf-8'
)
const serviceAccount = JSON.parse(decoded)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const app = express()
// middleware
app.use(
  cors({
    origin: [
      'http://localhost:5173',
    ],
    credentials: true,
    optionSuccessStatus: 200,
  })
)
app.use(express.json())

// jwt middlewares
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(' ')[1]
  console.log(token)
  if (!token) return res.status(401).send({ message: 'Unauthorized Access!' })
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.tokenEmail = decoded.email
    console.log(decoded)
    next()
  } catch (err) {
    console.log(err)
    return res.status(401).send({ message: 'Unauthorized Access!', err })
  }
}


// Role verification middleware
const verifyAdmin = async (req, res, next) => {
  const email = req.tokenEmail
  const user = await usersCollection.findOne({ email })
  if (user?.role !== 'admin') {
    return res.status(403).send({ message: 'Forbidden Access!' })
  }
  next()
}

const verifyManager = async (req, res, next) => {
  const email = req.tokenEmail
  const user = await usersCollection.findOne({ email })
  if (user?.role !== 'clubManager' && user?.role !== 'admin') {
    return res.status(403).send({ message: 'Forbidden Access!' })
  }
  next()
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
async function run() {
  try {

    const db = client.db('clubSphereDB')
    //collection
    const clubsCollection = db.collection('clubs')
    const usersCollection = db.collection('users')
    // Create or update user
    app.post('/users', async (req, res) => {
      const user = req.body
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null })
      }
      user.role = user.role || 'member'
      user.createdAt = new Date()
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    // Get user by email
    app.get('/users/:email', verifyJWT, async (req, res) => {
      const email = req.params.email
      if (email !== req.tokenEmail) {
        return res.status(403).send({ message: 'Forbidden Access!' })
      }
      const result = await usersCollection.findOne({ email })
      res.send(result)
    })

    // Get all users (Admin only)
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })
    // Save a plant data in db
    app.post('/clubs', async (req, res) => {
      const clubData = req.body
      console.log(clubData)
      const result = await clubsCollection.insertOne(plantData)
      res.send(result)
    })

    // get all plants from db
    app.get('/clubs', async (req, res) => {
      const result = await clubsCollection.find().toArray()
      res.send(result)
    })
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from Server..')
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
