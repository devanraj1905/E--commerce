import crypto from "node:crypto";
import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import Cart from "../models/cartModel.js";

export const razorpayWebhook = async (req, res) => {
 
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.get("x-razorpay-signature");

    // Verify configuration and the raw request body.
    if (!webhookSecret) {
        console.error("Razorpay webhook secret is not configured");
        return res.status(500).json({
            message: "Webhook is not configured"
        });
    }

    if (
        !Buffer.isBuffer(req.body) ||
        !signature ||
        !/^[a-f0-9]{64}$/i.test(signature)
    ) {
        return res.status(400).json({
            message: "Invalid webhook request"
        });
    }

    const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(req.body)
        .digest();

    const receivedSignature = Buffer.from(signature, "hex");

    if (!crypto.timingSafeEqual(expectedSignature, receivedSignature)) {
        return res.status(400).json({
            message: "Invalid webhook signature"
        });
    }

    // Parse the event only after signature validation.
    let event;

    try {
        event = JSON.parse(req.body.toString("utf8"));
        console.log("Razorpay webhook event:", event.event);
    } catch {
        return res.status(400).json({
            message: "Invalid JSON payload"
        });
    }

    // Handle Razorpay refund events separately.
    const refundEvents = [
        "refund.created",
        "refund.processed",
        "refund.failed"
    ];

    if (refundEvents.includes(event.event)) {
        const refund = event.payload?.refund?.entity;

        if (
            !refund?.id ||
            !refund.payment_id ||
            !Number.isSafeInteger(refund.amount)
        ) {
            return res.status(400).json({
                message: "Refund details missing or invalid"
            });
        }

        let refundSession;

        try {
            refundSession = await mongoose.startSession();

            let outcome = "processed";

            await refundSession.withTransaction(async () => {
                const order = await Order.findOne({
                    razorpayPaymentId: refund.payment_id
                }).session(refundSession);

                if (!order) {
                    outcome = "unknown_order";
                    return;
                }

                if (order.paymentMethod !== "Razorpay") {
                    outcome = "not_a_razorpay_order";
                    return;
                }

                // This cancellation flow supports full refunds only.
                const expectedAmount = Math.round(
                    order.totalPrice * 100
                );

                if (
                    refund.currency !== "INR" ||
                    refund.amount !== expectedAmount
                ) {
                    outcome = "refund_amount_mismatch";
                    return;
                }

                // Prevent duplicate processed events restoring stock twice.
                if (
                    order.refundStatus === "Processed" &&
                    order.paymentStatus === "Refunded" &&
                    order.orderStatus === "Cancelled"
                ) {
                    outcome =
                        order.razorpayRefundId === refund.id
                            ? "already_processed"
                            : "order_already_refunded";

                    return;
                }

                // Only handle orders currently waiting for their refund.
                if (
                    order.orderStatus !== "CancellationPending" ||
                    order.refundStatus !== "Pending" ||
                    order.paymentStatus !== "Paid"
                ) {
                    outcome = "order_not_waiting_for_refund";
                    return;
                }

                // Ignore events belonging to a different saved refund.
                if (
                    order.razorpayRefundId &&
                    order.razorpayRefundId !== refund.id
                ) {
                    outcome = "different_refund_id";
                    return;
                }

                order.razorpayRefundId = refund.id;
                order.refundAmount = refund.amount / 100;

                // Refund created: wait for final confirmation.
                if (event.event === "refund.created") {
                    order.refundStatus = "Pending";

                    await order.save({
                        session: refundSession
                    });

                    outcome = "refund_pending";
                    return;
                }

                // Refund failed: do not restore stock.
                if (event.event === "refund.failed") {
                    order.refundStatus = "Failed";
                    order.orderStatus = "Processing";

                    await order.save({
                        session: refundSession
                    });

                    outcome = "refund_failed";
                    return;
                }

                // Refund processed: restore stock and finalize cancellation.
                if (event.event === "refund.processed") {
                    for (const item of order.orderItems) {
                        const stockUpdate = await Product.updateOne(
                            {
                                _id: item.product
                            },
                            {
                                $inc: {
                                    stock: item.quantity
                                }
                            },
                            {
                                session: refundSession
                            }
                        );

                        if (stockUpdate.modifiedCount !== 1) {
                            throw new Error(
                                `Could not restore stock for product ${item.product}`
                            );
                        }
                    }

                    order.refundStatus = "Processed";
                    order.paymentStatus = "Refunded";
                    order.orderStatus = "Cancelled";

                    await order.save({
                        session: refundSession
                    });

                    outcome = "refund_processed";
                }
            });

            if (
                ![
                    "refund_pending",
                    "refund_failed",
                    "refund_processed",
                    "already_processed"
                ].includes(outcome)
            ) {
                console.error(
                    "Razorpay refund webhook needs review:",
                    outcome
                );
            }

            return res.status(200).json({
                received: true,
                outcome
            });
        } catch (error) {
            console.error(
                "Razorpay refund webhook processing error:",
                error
            );

            return res.status(500).json({
                message: "Refund webhook processing failed"
            });
        } finally {
            if (refundSession) {
                await refundSession.endSession();
            }
        }
    }

    // Only payment.captured should reach the payment handler.
    if (event.event !== "payment.captured") {
        return res.status(200).json({
            received: true,
            ignored: true
        });
    }

    const payment = event.payload?.payment?.entity;

    if (!payment?.id || !payment?.order_id) {
        return res.status(400).json({
            message: "Payment details missing"
        });
    }

    let session;

    try {
        session = await mongoose.startSession();

        let outcome = "processed";

        await session.withTransaction(async () => {
            const order = await Order.findOne({
                razorpayOrderId: payment.order_id
            }).session(session);

            if (!order) {
                outcome = "unknown_order";
                return;
            }

            // Validate amount, currency and payment status.
            if (
                payment.status !== "captured" ||
                payment.currency !== "INR" ||
                payment.amount !== Math.round(order.totalPrice * 100)
            ) {
                outcome = "payment_details_mismatch";
                return;
            }

            // Avoid deducting inventory twice for duplicate events.
            if (order.paymentStatus === "Paid") {
                outcome =
                    order.razorpayPaymentId === payment.id
                        ? "already_processed"
                        : "different_payment_already_recorded";

                return;
            }

            if (
                order.paymentStatus !== "Pending" ||
                order.orderStatus !== "AwaitingPayment"
            ) {
                outcome = "order_not_awaiting_payment";
                return;
            }

            // Deduct stock atomically.
            for (const item of order.orderItems) {
                const stockUpdate = await Product.updateOne(
                    {
                        _id: item.product,
                        stock: {
                            $gte: item.quantity
                        }
                    },
                    {
                        $inc: {
                            stock: -item.quantity
                        }
                    },
                    {
                        session
                    }
                );

                if (stockUpdate.modifiedCount !== 1) {
                    throw new Error(
                        `Stock unavailable for product ${item.product}`
                    );
                }
            }

            order.razorpayPaymentId = payment.id;
            order.paymentStatus = "Paid";
            order.orderStatus = "Processing";

            await order.save({
                session
            });

            // Remove only the purchased quantities from the user's cart.
            const cart = await Cart.findOne({
                user: order.user
            }).session(session);

            if (cart) {
                for (const orderedItem of order.orderItems) {
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

                await cart.save({
                    session
                });
            }

            outcome = "processed";
        });

        if (
            outcome !== "processed" &&
            outcome !== "already_processed"
        ) {
            console.error(
                "Razorpay webhook needs review:",
                outcome
            );
        }

        return res.status(200).json({
            received: true,
            outcome
        });
    } catch (error) {
        console.error(
            "Razorpay webhook processing error:",
            error
        );

        return res.status(500).json({
            message: "Webhook processing failed"
        });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};