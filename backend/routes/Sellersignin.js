// routes/sellerRoutes.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Wholesaler from '../models/sellerModel.js';

const router = express.Router();

router.post('/signin', async (req, res) => {
  try {
    const { whatsappNumber, password } = req.body;

    // 1. Find the seller
    const seller = await Wholesaler.findOne({ whatsappNumber });
    if (!seller) {
      return res.status(401).json({ success: false, message: "Wholesaler account not found" });
    }

    // 2. Validate Password
    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // 3. Generate Token
    const token = jwt.sign(
      { id: seller._id, role: 'seller' }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // 4. Return User object formatted for your Frontend
    res.json({
      success: true,
      token,
      user: {
        id: seller._id,
        businessName: seller.businessName, // Required for your Nav/Profile logic
        whatsappNumber: seller.whatsappNumber,
        role: 'seller', // Helps Frontend distinguish between Buyer/Seller
        location: seller.location,
        description: seller.description
      },
      message: "Wholesaler login successful"
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;