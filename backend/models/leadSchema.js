import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, required: true },
  wholesalerId: { type: mongoose.Schema.Types.ObjectId, ref: 'wholesaler', required: true },
  shortCode: { type: String, required: true, unique: true },
  buyerInfo: {
    name: { type: String, required: true },
    phone: { type: String, required: true }
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  acceptedAt: Date,
  isPaid: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Lead", LeadSchema);