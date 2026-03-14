import { Router } from "express";
import Lead from "../models/leadSchema.js";
import Wholesaler from "../models/sellerModel.js";

const router = Router();

// This is the URL you would give to Twilio/Meta: 
// e.g., https://your-domain.com/api/webhook/whatsapp
router.post("/whatsapp", async (req, res) => {
  try {
    // 1. Get data from the WhatsApp Provider
    // Twilio uses 'From' and 'Body'. Meta/Official API uses different keys.
    const { From, Body } = req.body; 
    const senderNumber = From.replace("whatsapp:", ""); // Clean the number
    const messageText = Body.trim().toUpperCase();

    console.log(`Received message: "${messageText}" from ${senderNumber}`);

    // 2. Check if the message starts with 'YES'
    if (messageText.startsWith("YES")) {
      // Extract the 4-digit code (e.g., "YES A7D2" -> "A7D2")
      const parts = messageText.split(" ");
      const code = parts[1];

      if (!code) {
        return res.status(200).send("Please provide the code, e.g., YES A1B2");
      }

      // 3. Find the Lead with this code
      const lead = await Lead.findOne({ shortCode: code }).populate("wholesalerId");

      if (!lead) {
        return res.status(200).send("Invalid code or lead expired.");
      }

      // 4. Verify the sender is actually the seller assigned to this lead
      if (lead.wholesalerId.whatsappNumber !== senderNumber) {
        return res.status(200).send("Unauthorized. This lead belongs to another seller.");
      }

      // 5. Success! Update Lead status and send Buyer Details
      lead.status = "accepted";
      lead.acceptedAt = new Date();
      await lead.save();

      const successMessage = `Lead Accepted! ✅\n\nBuyer: ${lead.buyerInfo.name}\nPhone: ${lead.buyerInfo.phone}\nWhatsApp: https://wa.me/${lead.buyerInfo.phone.replace("+", "")}`;
      
      // In a real app, you'd call your sendWhatsApp(senderNumber, successMessage) here
      console.log("Sending Buyer details to seller...");

      return res.status(200).send(successMessage);
    }

    // Default response for other messages
    res.status(200).send("Reply YES [CODE] to accept a lead.");

  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send();
  }
});

export default router;