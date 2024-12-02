import Razorpay from "razorpay";
const razorpay = new Razorpay({
    key_id: 'rzp_test_Y2wy8t1wD1AFaA',
    key_secret: 'zSqRMpIa2ljBBpkieFYGmfLa',
});

const createOrder = async (amount,) => {
    try {
        const options = {
            amount: req.body.amount * 100, // amount in smallest currency unit (paise for INR)
            currency: 'INR',
            receipt: 'order_' + Date.now(),
            payment_capture: 1 // auto capture
        };

        const order = await razorpay.orders.create(options);
        return({
            order_id: order.id,
            currency: order.currency,
            amount: order.amount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
