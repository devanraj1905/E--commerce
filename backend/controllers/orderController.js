import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";
import razorpay from "../config/razorpay.js";
import crypto from "node:crypto";

const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

export const createOrder = async (req, res) => {
    let session;

    try {
        const {
            shippingAddress,
            paymentMethod = "COD"
        } = req.body;

        
        const requiredFields = [
            "fullName",
            "phone",
            "address",
            "city",
            "state",
            "postalCode",
            "country"
        ];

        if (
            !shippingAddress ||
            requiredFields.some(
                field =>
                    typeof shippingAddress[field] !== "string" ||
                    !shippingAddress[field].trim()
            )
        ) {
            return res.status(400).json({
                message: "Please provide a complete shipping address"
            });
        }

        
        if (paymentMethod !== "COD") {
            return res.status(400).json({
                message: "Only COD is currently supported"
            });
        }

        
        session = await mongoose.startSession();

        let createdOrder;

        await session.withTransaction(async () => {

            
            const cart = await Cart.findOne({
                user: req.user._id
            }).session(session);

            if (!cart || cart.items.length === 0) {
                throw createHttpError(
                    "Your cart is empty",
                    400
                );
            }

            const orderItems = [];
            let itemsPrice = 0;

            
            for (const item of cart.items) {
                const product = await Product.findById(
                    item.product
                ).session(session);

                if (!product) {
                    throw createHttpError(
                        "A product in your cart no longer exists",
                        404
                    );
                }

                const quantity = Number(item.quantity);

                if (
                    !Number.isInteger(quantity) ||
                    quantity < 1
                ) {
                    throw createHttpError(
                        "Invalid product quantity",
                        400
                    );
                }

                if (quantity > product.stock) {
                    throw createHttpError(
                        `Insufficient stock for ${product.productName}`,
                        400
                    );
                }

                
                const stockUpdate = await Product.updateOne(
                    {
                        _id: product._id,
                        stock: { $gte: quantity }
                    },
                    {
                        $inc: { stock: -quantity }
                    },
                    { session }
                );

                if (stockUpdate.modifiedCount !== 1) {
                    throw createHttpError(
                        `Insufficient stock for ${product.productName}`,
                        400
                    );
                }

                
                orderItems.push({
                    product: product._id,
                    name: product.productName,
                    price: product.productPrice,
                    quantity,
                    image: product.image
                });

                itemsPrice += product.productPrice * quantity;
            }

            
            const shippingPrice = 0;
            itemsPrice = Number(itemsPrice.toFixed(2));

            const totalPrice = Number(
                (itemsPrice + shippingPrice).toFixed(2)
            );

            
            const [order] = await Order.create(
                [{
                    user: req.user._id,
                    orderItems,
                    shippingAddress: {
                        fullName: shippingAddress.fullName.trim(),
                        phone: shippingAddress.phone.trim(),
                        address: shippingAddress.address.trim(),
                        city: shippingAddress.city.trim(),
                        state: shippingAddress.state.trim(),
                        postalCode: shippingAddress.postalCode.trim(),
                        country: shippingAddress.country.trim()
                    },
                    itemsPrice,
                    shippingPrice,
                    totalPrice,
                    paymentMethod: "COD",
                    paymentStatus: "Pending",
                    orderStatus: "Processing"
                }],
                { session }
            );


            cart.items = [];
            await cart.save({ session });

            createdOrder = order;
        });

        return res.status(201).json({
            message: "Order created successfully",
            order: createdOrder
        });

    } catch (error) {
        

        const statusCode = error.statusCode || 500;

        return res.status(statusCode).json({
            message: error.statusCode
                ? error.message
                : "Unable to create order"
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

export const getMyOrders = async (req, res) => {
    try {
        
        const orders = await Order.find({
            user: req.user._id
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });

    } catch (error) {
        

        return res.status(500).json({
            message: "Unable to retrieve orders"
        });
    }
};

export const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;


        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        
        const order = await Order.findOne({
            _id: id,
            user: req.user._id
        });

        
        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        
        return res.status(200).json({
            success: true,
            order
        });

    } catch (error) {
        console.error("Get order details error:", error);

        return res.status(500).json({
            message: "Unable to retrieve order details"
        });
    }
};
export const cancelOrder = async (req, res) => {
    let session;

    try {
        const { id } = req.params;

        // 1. Validate order ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        // 2. Find the order belonging to the logged-in user
        const order = await Order.findOne({
            _id: id,
            user: req.user._id
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (order.orderStatus !== "Processing") {
            return res.status(400).json({
                message: "This order can no longer be cancelled"
            });
        }

  // 3. Razorpay orders need a refund
if (order.paymentMethod === "Razorpay") {
    if (
        order.paymentStatus !== "Paid" ||
        !order.razorpayPaymentId
    ) {
        return res.status(409).json({
            message: "Payment is not eligible for a refund"
        });
    }

    // Reserve cancellation to prevent duplicate refund requests.
    const reservedOrder = await Order.findOneAndUpdate(
        {
            _id: id,
            user: req.user._id,
            orderStatus: "Processing",
            paymentStatus: "Paid",
            refundStatus: {
                $in: ["NotRequested", "Failed"]
            }
        },
        {
            $set: {
                orderStatus: "CancellationPending",
                refundStatus: "Pending",
                refundAmount: order.totalPrice,
                refundRequestedAt: new Date(),
                razorpayRefundId: null
            }
        },
        { new: true }
    );

    if (!reservedOrder) {
        return res.status(409).json({
            message: "Cancellation or refund is already in progress"
        });
    }

    let refund;

    try {
        refund = await razorpay.payments.refund(
            reservedOrder.razorpayPaymentId,
            {
                amount: Math.round(
                    reservedOrder.totalPrice * 100
                ),
                notes: {
                    order_id: reservedOrder._id.toString(),
                    reason: "Customer cancellation"
                }
            }
        );
    } catch (error) {
        console.error("Razorpay refund request error:", error);

        // Don't retry automatically; the refund might have been accepted.
        return res.status(502).json({
            message:
                "Refund status is uncertain. Check Razorpay before retrying."
        });
    }

    // If Razorpay explicitly reports a failed refund,
    // allow the order to be reviewed and retried.
    if (refund.status === "failed") {
        await Order.updateOne(
            {
                _id: id,
                orderStatus: "CancellationPending",
                refundStatus: "Pending"
            },
            {
                $set: {
                    razorpayRefundId: refund.id,
                    refundAmount: refund.amount / 100,
                    refundStatus: "Failed",
                    orderStatus: "Processing"
                }
            }
        );

        return res.status(502).json({
            message: "Razorpay could not process the refund"
        });
    }

    // Save the refund ID. Keep cancellation pending until the
    // signed refund.processed webhook confirms completion.
    await Order.updateOne(
        {
            _id: id,
            orderStatus: "CancellationPending",
            refundStatus: "Pending"
        },
        {
            $set: {
                razorpayRefundId: refund.id,
                refundAmount: refund.amount / 100
            }
        }
    );

    const latestOrder = await Order.findById(id);

    return res.status(202).json({
        success: true,
        message:
            "Refund requested. Cancellation is awaiting refund confirmation.",
        order: latestOrder
    });
}
        // 4. COD cancellation: no Razorpay refund is needed.
        if (order.paymentMethod !== "COD") {
            return res.status(400).json({
                message: "Unsupported payment method"
            });
        }

        session = await mongoose.startSession();

        let cancelledOrder;

        await session.withTransaction(async () => {
            const currentOrder = await Order.findOne({
                _id: id,
                user: req.user._id,
                paymentMethod: "COD",
                orderStatus: "Processing"
            }).session(session);

            if (!currentOrder) {
                const error = new Error(
                    "Order cannot be cancelled or has already changed"
                );
                error.statusCode = 409;
                throw error;
            }

            for (const item of currentOrder.orderItems) {
                const stockUpdate = await Product.updateOne(
                    { _id: item.product },
                    { $inc: { stock: item.quantity } },
                    { session }
                );

                if (stockUpdate.matchedCount !== 1) {
                    const error = new Error(
                        "A product was not found; cancellation was rolled back"
                    );
                    error.statusCode = 409;
                    throw error;
                }
            }

            currentOrder.orderStatus = "Cancelled";
            await currentOrder.save({ session });

            cancelledOrder = currentOrder;
        });

        return res.status(200).json({
            success: true,
            message: "COD order cancelled successfully",
            order: cancelledOrder
        });

    } catch (error) {
        console.error("Cancel order error:", error);

        return res.status(error.statusCode || 500).json({
            message: error.statusCode
                ? error.message
                : "Unable to cancel order"
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};
export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("user", "userName email")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error("Get all orders error:", error);

        return res.status(500).json({
            message: "Unable to retrieve orders"
        });
    }
};
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderStatus } = req.body;

        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        
        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

if (
    order.paymentMethod === "Razorpay" &&
    order.paymentStatus !== "Paid"
) {
    return res.status(400).json({
        message: "Cannot ship an order before payment is confirmed"
    });
}

        
        const allowedNextStatus = {
            Processing: "Shipped",
            Shipped: "Delivered"
        };

        if (allowedNextStatus[order.orderStatus] !== orderStatus) {
            return res.status(400).json({
                message: `Order cannot move from ${order.orderStatus} to ${orderStatus}`
            });
        }

        
        
      const filter = {
    _id: id,
    orderStatus: order.orderStatus
};

if (order.paymentMethod === "Razorpay") {
    filter.paymentStatus = "Paid";      
}

const updatedOrder = await Order.findOneAndUpdate(
    filter,
    { $set: { orderStatus } },
    {
        new: true,
        runValidators: true
    }
);

        if (!updatedOrder) {
            return res.status(409).json({
                message: "Order status changed. Please try again."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            order: updatedOrder
        });

    } catch (error) {
        

        return res.status(500).json({
            message: "Unable to update order status"
        });
    }
};
export const createRazorpayOrder = async (req, res) => {
    try {
        const { shippingAddress } = req.body;

        
        const requiredFields = [
            "fullName",
            "phone",
            "address",
            "city",
            "state",
            "postalCode",
            "country"
        ];

        if (
            !shippingAddress ||
            requiredFields.some(
                field =>
                    typeof shippingAddress[field] !== "string" ||
                    !shippingAddress[field].trim()
            )
        ) {
            return res.status(400).json({
                message: "Please provide a complete shipping address"
            });
        }

        
        if (
            !process.env.RAZORPAY_KEY_ID ||
            !process.env.RAZORPAY_KEY_SECRET
        ) {
            return res.status(500).json({
                message: "Razorpay credentials are not configured"
            });
        }

        
        const cart = await Cart.findOne({
            user: req.user._id
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                message: "Your cart is empty"
            });
        }

        const orderItems = [];
        let itemsTotal = 0;

        
        for (const item of cart.items) {
            const product = await Product.findById(item.product);

            if (!product) {
                return res.status(404).json({
                    message: "A product in your cart no longer exists"
                });
            }

            const quantity = Number(item.quantity);

            if (
                !Number.isInteger(quantity) ||
                quantity < 1
            ) {
                return res.status(400).json({
                    message: "Invalid product quantity"
                });
            }

            if (quantity > product.stock) {
                return res.status(400).json({
                    message: `Insufficient stock for ${product.productName}`
                });
            }

            orderItems.push({
                product: product._id,
                name: product.productName,
                price: product.productPrice,
                quantity,
                image: product.image
            });

            itemsTotal += product.productPrice * quantity;
        }

        
        const itemsPrice = Number(itemsTotal.toFixed(2));
        const shippingPrice = 0;
        const totalPrice = Number(
            (itemsPrice + shippingPrice).toFixed(2)
        );

        const amountInPaise = Math.round(totalPrice * 100);
        console.log({
    itemsPrice,
    shippingPrice,
    totalPrice,
    amountInPaise
});

        if (!Number.isSafeInteger(amountInPaise) || amountInPaise < 100) {
            return res.status(400).json({
                message: "Invalid payment amount"
            });
        }

        
        const razorpayOrder = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_${Date.now()}_${req.user._id.toString().slice(-8)}`
        });

        
        const order = await Order.create({
            user: req.user._id,
            orderItems,
            shippingAddress: {
                fullName: shippingAddress.fullName.trim(),
                phone: shippingAddress.phone.trim(),
                address: shippingAddress.address.trim(),
                city: shippingAddress.city.trim(),
                state: shippingAddress.state.trim(),
                postalCode: shippingAddress.postalCode.trim(),
                country: shippingAddress.country.trim()
            },
            itemsPrice,
            shippingPrice,
            totalPrice,
            paymentMethod: "Razorpay",
            paymentStatus: "Pending",
            orderStatus: "AwaitingPayment",
            razorpayOrderId: razorpayOrder.id
        });

        
        return res.status(201).json({
            success: true,
            message: "Razorpay order created successfully",
            keyId: process.env.RAZORPAY_KEY_ID,
            razorpayOrder: {
                id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency
            },
            orderId: order._id,
            totalPrice: order.totalPrice
        });

    } catch (error) {
        console.error("Create Razorpay order error:", error);

        return res.status(500).json({
            message: "Unable to create Razorpay order"
        });
    }
};
export const verifyRazorpayPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        
        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            return res.status(400).json({
                message: "Payment verification details are required"
            });
        }

        
        const order = await Order.findOne({
            user: req.user._id,
            razorpayOrderId: razorpay_order_id
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        
        if (order.paymentStatus === "Paid") {
            if (order.razorpayPaymentId === razorpay_payment_id) {
                return res.status(200).json({
                    success: true,
                    message: "Payment already verified",
                    order
                });
            }

            return res.status(409).json({
                message: "Order has already been paid"
            });
        }

        if (
            order.paymentStatus !== "Pending" ||
            order.orderStatus !== "AwaitingPayment"
        ) {
            return res.status(409).json({
                message: "This order is not awaiting payment"
            });
        }

        
        const expectedSignature = crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            )
            .update(
                `${order.razorpayOrderId}|${razorpay_payment_id}`
            )
            .digest("hex");

        
        if (!/^[a-f0-9]{64}$/i.test(razorpay_signature)) {
            return res.status(400).json({
                message: "Invalid payment signature"
            });
        }

        const expectedBuffer = Buffer.from(expectedSignature, "hex");
        const receivedBuffer = Buffer.from(razorpay_signature, "hex");

        if (!crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
            return res.status(400).json({
                message: "Payment signature verification failed"
            });
        }

        
        const payment = await razorpay.payments.fetch(
            razorpay_payment_id
        );

        if (
            payment.order_id !== order.razorpayOrderId ||
            payment.amount !== Math.round(order.totalPrice * 100) ||
            payment.currency !== "INR"
        ) {
            return res.status(400).json({
                message: "Payment details do not match the order"
            });
        }

        if (payment.status !== "captured") {
            return res.status(409).json({
                message: "Payment has not been captured yet"
            });
        }

        
        const session = await mongoose.startSession();
        let verifiedOrder;

        try {
            await session.withTransaction(async () => {
                const currentOrder = await Order.findOne({
                    _id: order._id,
                    user: req.user._id
                }).session(session);

                if (!currentOrder) {
                    const error = new Error("Order not found");
                    error.statusCode = 404;
                    throw error;
                }

                
                if (currentOrder.paymentStatus === "Paid") {
                    if (
                        currentOrder.razorpayPaymentId ===
                        razorpay_payment_id
                    ) {
                        verifiedOrder = currentOrder;
                        return;
                    }

                    const error = new Error("Order already paid");
                    error.statusCode = 409;
                    throw error;
                }

                if (
                    currentOrder.paymentStatus !== "Pending" ||
                    currentOrder.orderStatus !== "AwaitingPayment"
                ) {
                    const error = new Error(
                        "Order is no longer awaiting payment"
                    );
                    error.statusCode = 409;
                    throw error;
                }

                
                for (const item of currentOrder.orderItems) {
                    const stockUpdate = await Product.updateOne(
                        {
                            _id: item.product,
                            stock: { $gte: item.quantity }
                        },
                        {
                            $inc: { stock: -item.quantity }
                        },
                        { session }
                    );

                    if (stockUpdate.modifiedCount !== 1) {
                        const error = new Error(
                            "Insufficient stock to complete the order"
                        );
                        error.statusCode = 409;
                        throw error;
                    }
                }

                currentOrder.razorpayPaymentId =
                    razorpay_payment_id;
                currentOrder.paymentStatus = "Paid";
                currentOrder.orderStatus = "Processing";

                await currentOrder.save({ session });

                
                const cart = await Cart.findOne({
                    user: req.user._id
                }).session(session);

                if (cart) {
                    for (const orderedItem of currentOrder.orderItems) {
                        const cartItem = cart.items.find(
                            item =>
                                item.product.toString() ===
                                orderedItem.product.toString()
                        );

                        if (!cartItem) continue;

                        if (cartItem.quantity > orderedItem.quantity) {
                            cartItem.quantity -= orderedItem.quantity;
                        } else {
                            cart.items.pull(cartItem._id);
                        }
                    }

                    await cart.save({ session });
                }

                verifiedOrder = currentOrder;
            });
        } finally {
            await session.endSession();
        }

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            order: verifiedOrder
        });

    } catch (error) {
        console.error("Payment verification error:", error);

        return res.status(error.statusCode || 500).json({
            message: error.statusCode
                ? error.message
                : "Unable to verify payment"
        });
    }
};