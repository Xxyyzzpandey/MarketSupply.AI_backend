
// import { GoogleGenerativeAI } from '@google/generative-ai';
// import dotenv from "dotenv";
// import { Router } from "express";
// import Wholesaler from "../models/sellerModel.js";
// import Lead from "../models/leadSchema.js"; // Ensure this is imported

// dotenv.config();

// const router = Router();
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// router.post("/searchProduct", async (req, res) => {
//   const { userPrompt, buyerInfo } = req.body;
//   console.log(userPrompt);
//   try {
//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
//     const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

//     // STEP 1: PARSING & EMBEDDING (Parallel for speed)
//     const [parseResult, vectorResult] = await Promise.all([
//       model.generateContent(`Extract JSON from: "${userPrompt}". Format: {"category": "string", "item": "string", "qty": "number", "specs": "string"}`),
//       embeddingModel.embedContent(userPrompt)
//     ]);

//     // Clean Gemini's response (removes ```json wrappers)
//     const specsText = parseResult.response.text().replace(/```json|```/g, "").trim();
//     const specs = JSON.parse(specsText);
//     const userVector = vectorResult.embedding.values;

//     // STEP 2: SEMANTIC SEARCH (Solves category mismatch)
//     // Find wholesalers who are conceptually similar to the user prompt
//     const potentialSuppliers = await Wholesaler.aggregate([
//       {
//         $vectorSearch: {
//           index: "vector_index", 
//           path: "embedding",
//           queryVector: userVector,
//           numCandidates: 20,
//           limit: 10
//         }
//       }
//     ]);

//     if (potentialSuppliers.length === 0) {
//       return res.status(404).json({ success: false, message: "No matching wholesalers found." });
//     }

//     // STEP 3: GEMINI RANKING
//     const rankingPrompt = `Compare this buyer request: ${JSON.stringify(specs)} 
//     with these suppliers: ${JSON.stringify(potentialSuppliers.map(s => ({id: s._id, desc: s.description})))}. 
//     Return the top 3 supplier IDs that match best as a JSON array of strings: ["id1", "id2"]`;

//     const rankingResult = await model.generateContent(rankingPrompt);
//     const topSupplierIds = JSON.parse(rankingResult.response.text().replace(/```json|```/g, "").trim());

//     // STEP 4: NOTIFY & LOG LEADS
//     const notificationPromises = topSupplierIds.map(async (id) => {
//       const supplier = potentialSuppliers.find(s => s._id.toString() === id);
//       if (supplier) {
//         // Create the lead entry
//         await Lead.create({ 
//             buyerInfo, 
//             supplierId: id, 
//             status: 'pending',
//             details: specs 
//         });

//         // TODO: Trigger WhatsApp API call here to supplier.whatsappNumber
//       }
//     });

//     await Promise.all(notificationPromises);

//     res.json({ success: true, message: "Top wholesalers notified via WhatsApp!" });

//   } catch (error) {
//     console.error("Internal Error:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// export default router;


// import { GoogleGenerativeAI } from "@google/generative-ai";
// import dotenv from "dotenv";
// import { Router } from "express";
// import Wholesaler from "../models/sellerModel.js";
// import Lead from "../models/leadSchema.js";

// dotenv.config();

// const router = Router();
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// router.post("/searchProduct", async (req, res) => {
    
//   try {
//     const { userPrompt, buyerInfo } = req.body;

//     if (!userPrompt) {
//       return res.status(400).json({ success: false, message: "userPrompt is required" });
//     }

//     const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

//     const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

//     // -----------------------------
//     // STEP 1: PARSE + EMBED (parallel)
//     // -----------------------------
//     const parsePrompt = `
// Extract structured JSON from this request.
// Return ONLY valid JSON. No explanation. No markdown.

// User request: "${userPrompt}"

// Format:
// {
//   "category": "string",
//   "item": "string",
//   "qty": number,
//   "specs": "string"
// }
// `;

//     const [parseResult, vectorResult] = await Promise.all([
//       model.generateContent(parsePrompt),
//       embeddingModel.embedContent(userPrompt),
//     ]);

//     const rawText = parseResult.response.text().replace(/```json|```/g, "").trim();

//     let specs;
//     try {
//       specs = JSON.parse(rawText);
//     } catch (err) {
//       return res.status(400).json({
//         success: false,
//         message: "AI parsing failed",
//         raw: rawText,
//       });
//     }

//     const userVector = vectorResult.embedding.values;

//     // -----------------------------
//     // STEP 2: VECTOR SEARCH
//     // -----------------------------
//     const potentialSuppliers = await Wholesaler.aggregate([
//       {
//         $vectorSearch: {
//           index: "vector_index",
//           path: "embedding",
//           queryVector: userVector,
//           numCandidates: 20,
//           limit: 10,
//         },
//       },
//     ]);

//     if (!potentialSuppliers.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No matching wholesalers found.",
//       });
//     }

//     // -----------------------------
//     // STEP 3: GEMINI RANKING
//     // -----------------------------
//     const suppliersForRanking = potentialSuppliers.map((s) => ({
//       id: s._id.toString(),
//       description: s.description,
//       city: s.city,
//       minOrderQty: s.minOrderQty,
//     }));

//     const rankingPrompt = `
// Buyer request:
// ${JSON.stringify(specs)}

// Suppliers:
// ${JSON.stringify(suppliersForRanking)}

// Return ONLY top 3 supplier IDs as JSON array:
// ["id1","id2","id3"]
// `;

//     const rankingResult = await model.generateContent(rankingPrompt);

//     const rankedText = rankingResult.response
//       .text()
//       .replace(/```json|```/g, "")
//       .trim();

//     let topSupplierIds;
//     try {
//       topSupplierIds = JSON.parse(rankedText);
//     } catch {
//       return res.status(400).json({
//         success: false,
//         message: "Ranking parsing failed",
//         raw: rankedText,
//       });
//     }

//     // -----------------------------
//     // STEP 4: CREATE LEADS
//     // -----------------------------
//     const leadPromises = topSupplierIds.map(async (id) => {
//       const supplier = potentialSuppliers.find(
//         (s) => s._id.toString() === id
//       );

//       if (!supplier) return;

//       await Lead.create({
//         buyerInfo,
//         supplierId: id,
//         status: "pending",
//         details: specs,
//       });

//       // TODO: integrate WhatsApp Business API here
//     });

//     await Promise.all(leadPromises);

//     return res.json({
//       success: true,
//       message: "Top wholesalers notified successfully.",
//       parsedRequest: specs,
//       matchedSuppliers: topSupplierIds,
//     });
//   } catch (error) {
//     console.error("Internal Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// });

// export default router;

import Groq from "groq-sdk";
import { Router } from "express";
import Wholesaler from "../models/sellerModel.js";
import Lead from "../models/leadSchema.js";
import { generateVector } from "../utils/aiHelper.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import crypto from "crypto"; 
import SourcingRequest from "../models/sourcingModel.js"

dotenv.config();

const router = Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Helper to generate a code like "A7D2"
const generateShortCode = () => crypto.randomBytes(2).toString('hex').toUpperCase();

const sendWhatsApp = async (to, body) => {
  // Integrate your Twilio/AISensy/Meta API here
  console.log(`[WhatsApp Outgoing] To: ${to}, Message: ${body}`);
};

router.post("/searchProduct", async (req, res) => {
  try {
    const { userPrompt, buyerInfo } = req.body;
    console.log(req.body);
    if (!buyerInfo || !buyerInfo.id) {
        return res.status(400).json({ 
            success: false, 
            message: "Buyer information with a valid ID is required." 
        });
    }

    // 1. Parse + Embed
    const [parseResult, userVector] = await Promise.all([
      groq.chat.completions.create({
        messages: [{ role: "user", content: `Extract JSON: {"category": "string", "item": "string", "quantity": number, "specifications": "string"}. User request: "${userPrompt}"` }],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      }),
      generateVector(userPrompt)
    ]);
     console.log("parsed result by llm ",parseResult.choices[0].message)
    const specs = JSON.parse(parseResult.choices[0].message.content);

    // 2. CREATE REQUEST (Source of Truth)
    // This allows you to track buyer history and request status easily
    const newRequest = await SourcingRequest.create({
      buyerId: buyerInfo.id,
      originalPrompt: userPrompt,
      structuredData: specs, // Stores the item, qty, and specs
      status: 'notified'
    });

    // 3. Vector Search
    const potentialSuppliers = await Wholesaler.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: userVector,
          numCandidates: 20,
          limit: 10,
        },
      },
    ]);

    if (!potentialSuppliers.length) return res.status(200).json({ success: false, message: "No match." });

    // 4. Groq Ranking
    const rankingPrompt = `Buyer needs: ${JSON.stringify(specs)}. Suppliers: ${JSON.stringify(potentialSuppliers.map(s => ({id: s._id, desc: s.description}))) }. Return ONLY a JSON array of top 3 supplier IDs.`;
    const rankingResult = await groq.chat.completions.create({
      messages: [{ role: "user", content: rankingPrompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const finalIds = Object.values(JSON.parse(rankingResult.choices[0].message.content))[0];

    // 5. Create Leads referencing the newRequest._id
    await Promise.all(finalIds.map(async (id) => {
      const seller = await Wholesaler.findById(id);
      if (!seller) return;

      const shortCode = generateShortCode();

      await Lead.create({ 
        buyerInfo, 
        wholesalerId: id, 
        requestId: newRequest._id, // Link to the SourcingRequest
        shortCode, 
        status: "pending" 
      });

      const message = `*New Lead Alert!* 📦\n\nHello ${seller.businessName}, a buyer wants: *${specs.item}*.\n\nReply *YES ${shortCode}* to accept.`;
      await sendWhatsApp(seller.whatsappNumber, message);
    }));

    return res.json({ 
      success: true, 
      requestId: newRequest._id, 
      message: "Leads generated and sellers notified." 
    });

  } catch (error) {
    console.error("Route Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;