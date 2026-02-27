import express from "express"
import cors from "cors";
import dotenv from "dotenv";
import {connectDB} from "../database/db.js"
import searchProduct from "../routes/searchProduct.js"
import sellersignupRouter from "../routes/SellersignupRoute.js"
import { getEmbedder } from "../utils/aiHelper.js";
import addSellerRouter from "../routes/addSeller.js"
import whatsappWebhook from "../routes/whatsappWebhook.js"
import normalUsersignin from "../routes/normaluserSignin.js"
import Sellersignin from "../routes/Sellersignin.js";
import userSignup from "../routes/NormalUserSignup.js"

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

connectDB();
try {
    await getEmbedder(); 
  } catch (err) {
    console.error("Failed to pre-warm AI model:", err.message);
  }

app.use((req, res, next) => {
  console.log("Incoming:", req.method, req.url);
  next();
});

app.get("/", async(req , res)=>{console.log("working")});



app.listen(5000, () => console.log("Server running on port 5000"));