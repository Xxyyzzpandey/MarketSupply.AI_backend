import mongoose from "mongoose";

const WholesalerSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  contactPerson: String,
    whatsappNumber: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true    //remove whitespace
  },
  password: { 
    type: String, 
    required: true 
  },
  description: { type: String, required: true },

  // VECTOR EMBEDDING (Used by MongoDB Vector Search)
  embedding: { 
    type: [Number], 
    required: true
  },

  categories: [{ type: String }], 
  tags: [{ type: String }],
  isVerified: { type: Boolean, default: false },
  rating: { type: Number, default: 5 },
  location: {
    country: String,
    city: String
  },
  status: { 
    type: String, 
    enum: ['active', 'paused', 'busy'], 
    default: 'active' 
  },
  createdAt: { type: Date, default: Date.now }
});

// Create a compound index if you plan on searching by location + embedding often
WholesalerSchema.index({ "location.country": 1, status: 1 });

export default mongoose.model("wholesaler", WholesalerSchema);