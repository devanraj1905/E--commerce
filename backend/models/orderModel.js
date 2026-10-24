import mongoose from "mongoose";


const shippingAddressSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        postalCode: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        }
    },
    { _id: false }
);


const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    image: {
        type: String,
        required: true
    }
});


const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        orderItems: {
            type: [orderItemSchema],
            required: true,
            validate: {
                validator: items => items.length > 0,
                message: "An order must contain at least one product"
            }
        },

        shippingAddress: {
            type: shippingAddressSchema,
            required: true
        },

        itemsPrice: {
            type: Number,
            required: true,
            min: 0
        },

        shippingPrice: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        totalPrice: {
            type: Number,
            required: true,
            min: 0
        },

        paymentMethod: {
            type: String,
            enum: ["COD", "Razorpay"],
            default: "COD",
            required: true
        },

        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid", "Failed", "Refunded"],
            default: "Pending"
        },
        razorpayRefundId: {
    type: String,
    default: null
},

refundStatus: {
    type: String,
    enum: [
        "NotRequested",
        "Pending",
        "Processed",
        "Failed"
    ],
    default: "NotRequested"
},

refundAmount: {
    type: Number,
    min: 0,
    default: 0
},

refundRequestedAt: {
    type: Date,
    default: null
},
        razorpayOrderId: {
            type: String,
            unique: true,
            sparse: true
        },
        razorpayPaymentId: {
            type: String
        },  
       orderStatus: {
    type: String,
 enum: [
    "AwaitingPayment",
    "Processing",
    "CancellationPending",
    "Shipped",
    "Delivered",
    "Cancelled"
],
    default: "Processing"
}
        
    },
    { timestamps: true }
);

export default mongoose.model("Order", orderSchema);