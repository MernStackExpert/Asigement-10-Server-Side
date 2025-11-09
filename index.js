require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 3000;
const admin = require("firebase-admin");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(cors());
app.use(express.json());

// firebase admin sdk
const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyFirebaseToken = async (req, res, next) => {

  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = req.headers.authorization.split(" ")[1];

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.token_email = userInfo.email;
    console.log(userInfo)
    next();
  } catch {
    return res.status(401).send({ message: "unauthorized access" });
  }

};

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function run() {
  try {
    await client.connect();
    const db = client.db("Asigement-10");
    const transactionsCollection = db.collection("transactions");

    app.get("/transactions", verifyFirebaseToken,   async (req, res) => {
      const email = req.query.email;
      const sortField = req.query.sort || "date";
      const sortOrder = req.query.order || "desc";

      let query = {};
      if (email) {
        if(email !== req.token_email){
              return res.status(403).send({ message: "Forbidden Access" });
        }
        query = { userEmail: email };
      }

      let sortOptions = {};
      sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;

      try {
        const transactions = await transactionsCollection
          .find(query)
          .sort(sortOptions)
          .toArray();
        res.send(transactions);
      } catch (error) {
        res.status(500).send({ message: "Server Error fetching transactions" });
      }
    });

    app.post("/transactions",  async (req, res) => {
      const data = req.body;
      const result = await transactionsCollection.insertOne(data);
      res.send(result);
    });

    app.patch("/transactions/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const result = await transactionsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });

    app.get("/transactions/:id",  async (req, res) => {
      const id = req.params.id;
      try {
        const transaction = await transactionsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!transaction) {
          return res.status(404).send({ message: "Transaction not found" });
        }

        const categoryTotalAgg = await transactionsCollection
          .aggregate([
            {
              $match: {
                category: transaction.category,
                userEmail: transaction.userEmail,
                type: transaction.type,
              },
            },
            { $group: { _id: "$category", total: { $sum: "$amount" } } },
          ])
          .toArray();
        const categoryTotal = categoryTotalAgg[0]?.total || 0;

        res.send({ transaction, categoryTotal });
      } catch (error) {
        res.status(500).send({ message: "Server Error" });
      }
    });

    app.delete("/transactions/:id", async (req, res) => {
      const id = req.params.id;
      const result = await transactionsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`);
// });

module.exports = app;
