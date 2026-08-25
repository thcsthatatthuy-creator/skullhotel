const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

// Item price in VND - must match the client-side config
const ITEM_PRICE = 20000;
const SEPAY_SECRET_KEY = process.env.SEPAY_SECRET_KEY || 'spsk_live_AWKkKmiFN26Z4cnddZ5HjFm37VEBeBTg';

/**
 * Verify SePay Webhook Signature
 */
function verifySignature(req) {
	try {
		const payload = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
		const signature = crypto
			.createHmac('sha256', SEPAY_SECRET_KEY)
			.update(payload)
			.digest('hex');
			
		// SePay sends the signature in the Authorization header as "Apikey {signature}"
		const authHeader = req.headers.authorization || '';
		const providedSignature = authHeader.replace(/^Apikey\s+/i, '');
		
		return signature === providedSignature;
	} catch (e) {
		console.error("Signature verification failed", e);
		return false;
	}
}

/**
 * SePay Webhook Receiver
 */
exports.sepayWebhook = functions.https.onRequest(async (req, res) => {
	// Only accept POST
	if (req.method !== 'POST') {
		res.status(405).json({ success: false, message: 'Method not allowed' });
		return;
	}

	// Verify the webhook is actually from SePay
	if (!verifySignature(req)) {
		console.warn('Unauthorized webhook request: Invalid signature');
		res.status(401).json({ success: false, message: 'Unauthorized' });
		return;
	}

	try {
		const data = req.body;

		// Log for debugging (remove in production if needed)
		console.log('SePay webhook received:', JSON.stringify(data));

		// Validate required fields
		if (!data || !data.transferAmount || !data.content) {
			console.warn('Invalid webhook payload: missing required fields');
			res.status(200).json({ success: true }); // Always return 200 to SePay
			return;
		}

		// Only process incoming transfers
		if (data.transferType !== 'in') {
			console.log('Skipping non-incoming transfer');
			res.status(200).json({ success: true });
			return;
		}

		// Extract order ID from transfer content
		// Our order IDs start with "SH" prefix
		const content = (data.content || '').toUpperCase().trim();
		const orderIdMatch = content.match(/SH[A-Z0-9]+/);

		if (!orderIdMatch) {
			console.log('No valid order ID found in content:', content);
			res.status(200).json({ success: true });
			return;
		}

		const orderId = orderIdMatch[0];
		const transferAmount = parseInt(data.transferAmount, 10);

		// Verify amount matches item price
		if (transferAmount < ITEM_PRICE) {
			console.warn(
				`Payment amount mismatch: received ${transferAmount}, expected ${ITEM_PRICE}`
			);
			// Still save the payment but mark as insufficient
			await db
				.collection('payments')
				.doc(orderId)
				.set(
					{
						status: 'insufficient',
						amount: transferAmount,
						expectedAmount: ITEM_PRICE,
						gateway: data.gateway || 'unknown',
						referenceCode: data.referenceCode || '',
						content: data.content || '',
						transactionDate: data.transactionDate || '',
						rawData: data,
						updatedAt: admin.firestore.FieldValue.serverTimestamp(),
					},
					{ merge: true }
				);

			res.status(200).json({ success: true });
			return;
		}

		// Payment is valid - update Firestore
		await db
			.collection('payments')
			.doc(orderId)
			.set(
				{
					status: 'paid',
					amount: transferAmount,
					gateway: data.gateway || 'unknown',
					referenceCode: data.referenceCode || '',
					content: data.content || '',
					transactionDate: data.transactionDate || '',
					rawData: data,
					paidAt: admin.firestore.FieldValue.serverTimestamp(),
					updatedAt: admin.firestore.FieldValue.serverTimestamp(),
				},
				{ merge: true }
			);

		console.log(`Payment confirmed for order: ${orderId}, amount: ${transferAmount}`);

		res.status(200).json({ success: true });
	} catch (error) {
		console.error('Webhook processing error:', error);
		// Always return 200 to prevent SePay from retrying
		res.status(200).json({ success: true });
	}
});
