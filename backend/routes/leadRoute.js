// import express from 'express';
// import Lead from '../models/leadSchema.js';
// import Wholesaler from '../models/sellerModel.js';
// import { authenticateToken } from "../middleware/authmiddleware.js" 

// const router = express.Router();

// /**
//  * @route   GET /api/leads/seller
//  * @desc    Get all leads assigned to the logged-in wholesaler
//  */
// router.get('/seller', authenticateToken, async (req, res) => {
//   try {
//     // Check if user is a seller
//     if (req.user.role !== 'seller') {
//       return res.status(403).json({ success: false, message: "Access denied." });
//     }

//     const leads = await Lead.find({ wholesalerId: req.user.id })
//       .sort({ createdAt: -1 });
//     console.log(leads);
//     res.json({
//       success: true,
//       leads
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// /**
//  * @route   PATCH /api/leads/:leadId/accept
//  * @desc    Seller accepts the lead to reveal buyer contact info
//  */
// router.patch('/:leadId/accept', authenticateToken, async (req, res) => {
//   try {
//     const { leadId } = req.params;

//     const lead = await Lead.findOne({ _id: leadId, wholesalerId: req.user.id });

//     if (!lead) {
//       return res.status(404).json({ success: false, message: "Lead not found." });
//     }

//     if (lead.status === 'accepted') {
//       return res.status(400).json({ success: false, message: "Lead already accepted." });
//     }

//     // Update status
//     lead.status = 'accepted';
//     await lead.save();

//     // Here you would typically trigger the WhatsApp message to the Buyer
//     // informing them that a Seller has accepted their request.
    
//     res.json({
//       success: true,
//       message: "Lead accepted. Buyer contact revealed.",
//       buyerInfo: lead.buyerInfo // Return contact details now that it's accepted
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// /**
//  * @route   GET /api/leads/buyer
//  * @desc    Get history of requests made by a buyer (Normal User)
//  */
// router.get('/buyer', authenticateToken, async (req, res) => {
//   try {
//     // Assuming buyer logs in with WhatsApp number
//     const leads = await Lead.find({ "buyerInfo.phone": req.user.whatsappNumber })
//       .populate('wholesalerId', 'businessName location')
//       .sort({ createdAt: -1 });
//     console.log(leads);
//     res.json({ success: true, leads });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// export default router;



import express from "express";
import Lead from "../models/leadSchema.js";
import Wholesaler from "../models/sellerModel.js";
import { authenticateToken } from "../middleware/authmiddleware.js";
import User from "../models/users.js";
import SourcingRequest from "../models/sourcingModel.js"


const router = express.Router();

/**
 * GET SELLER LEADS
 */
router.get("/seller", authenticateToken, async (req, res) => {
  try {
    // 1. Fetch all leads assigned to the authenticated wholesaler
    const leads = await Lead.find({ wholesalerId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    if (leads.length === 0) {
      return res.json({ success: true, leads: [] });
    }

    // 2. Extract requestIds and fetch the corresponding SourcingRequests
    const requestIds = leads.map(lead => lead.requestId);
    const requests = await SourcingRequest.find({ _id: { $in: requestIds } }).lean();

    // 3. Create a map for quick access (ID -> Request Data)
    const requestMap = requests.reduce((acc, req) => {
      acc[req._id.toString()] = req;
      return acc;
    }, {});

    // 4. Combine lead info with the structuredData
    const combinedLeads = leads.map(lead => {
      const request = requestMap[lead.requestId.toString()];
      return {
        ...lead,
        // Map structuredData to the 'details' field the frontend uses
        details: request ? {
          item: request.structuredData.item,
          specs: request.structuredData.specifications,
          qty: request.structuredData.quantity
        } : { item: "N/A", specs: "N/A", qty: 0 }
      };
    });
     console.log(combinedLeads)
    res.json({ success: true, leads: combinedLeads });

  } catch (error) {
    console.error("Dashboard Fetch Error:", error);
    res.status(500).json({ success: false, message: "Server error occurred." });
  }
});

/**
 * ACCEPT LEAD
 */
router.patch("/:leadId/accept", authenticateToken, async (req, res) => {
  try {

    if (req.user.role !== "seller") {
      return res.status(403).json({
        success: false,
        message: "Only sellers can accept leads."
      });
    }

    const { leadId } = req.params;

    const lead = await Lead.findOne({
      _id: leadId,
      wholesalerId: req.user.id
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found."
      });
    }

    if (lead.status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "Lead already accepted."
      });
    }

    lead.status = "accepted";

    await lead.save();

    res.json({
      success: true,
      message: "Lead accepted. Buyer contact revealed.",
      buyerInfo: lead.buyerInfo
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


/**
 * GET BUYER HISTORY
 */
router.get("/buyer", authenticateToken, async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    const leads = await Lead.find({
      "buyerInfo.phone": user.whatsappNumber
    })
      .populate("wholesalerId", "businessName location")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      leads
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
export default router;