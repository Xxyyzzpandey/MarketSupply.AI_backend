import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SourcingRequest', required: true },
  wholesalerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wholesaler', required: true },
  
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  
  // Track when the wholesaler clicked the WhatsApp link
  acceptedAt: Date,
  
  // To prevent double-charging or spam
  isPaid: { type: Boolean, default: false } 
});

export default mongoose.model("Lead", LeadSchema);
