const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middle ware

app.use(cors());
app.use(express.json());
///

const uri =
  "mongodb+srv://Asigement-10:ctbYc8XF84G8hd4R@cluster0.gby4cz6.mongodb.net/finEaseDB?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// mongo db
async function run() {
  try {
    await client.connect();
    const db = client.db("Asigement-10");
    const transactionsCollection = db.collection("transactions");

    // get
    app.get("/transactions", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { userEmail: email };
      }
      const transactions = await transactionsCollection.find(query).toArray();
      res.send(transactions);
    });

    //post
    app.post("/transactions", async (req, res) => {
      const data = req.body;
      const result = await transactionsCollection.insertOne(data);
      res.send(result);
    });

    // Update
    app.patch("/transactions/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const result = await transactionsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
