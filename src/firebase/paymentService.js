import { db } from './config';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import useItemStore from '../hooks/useItemStore';

// SePay bank configuration
const SEPAY_BANK_CODE = import.meta.env.VITE_SEPAY_BANK_CODE || 'MB';
const SEPAY_ACCOUNT_NUMBER =
	import.meta.env.VITE_SEPAY_ACCOUNT_NUMBER || '0792362190';
const ITEM_PRICE =
	parseInt(import.meta.env.VITE_SEPAY_ITEM_PRICE, 10) || 20000;

/**
 * Generate a unique order ID for the payment
 * Format: SKULLHOTEL + timestamp + random suffix
 */
export function generateOrderId() {
	const timestamp = Date.now().toString(36).toUpperCase();
	const random = Math.random().toString(36).substring(2, 6).toUpperCase();
	return `SH${timestamp}${random}`;
}

/**
 * Get the SePay QR code URL for VietQR payment
 * This is a client-side URL - no API call needed
 */
export function getQRCodeUrl(orderId) {
	const params = new URLSearchParams({
		acc: SEPAY_ACCOUNT_NUMBER,
		bank: SEPAY_BANK_CODE,
		amount: ITEM_PRICE.toString(),
		des: orderId,
	});
	return `https://qr.sepay.vn/img?${params.toString()}`;
}

/**
 * Get the item price
 */
export function getItemPrice() {
	return ITEM_PRICE;
}

/**
 * Format price for display
 */
export function formatPrice(amount) {
	return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
}

/**
 * Start listening for payment confirmation via Firestore realtime listener
 * Much more efficient than polling - fires immediately when data changes
 */
export function listenForPayment(orderId, onSuccess, onError) {
	const paymentRef = doc(db, 'payments', orderId);

	const unsubscribe = onSnapshot(
		paymentRef,
		(snapshot) => {
			if (snapshot.exists()) {
				const data = snapshot.data();
				if (data.status === 'paid') {
					unsubscribe();
					if (onSuccess) onSuccess(data);
				}
			}
		},
		(error) => {
			console.warn('Payment listener error:', error);
			if (onError) onError(error);
		}
	);

	// Return unsubscribe function for cleanup
	return unsubscribe;
}

/**
 * Check payment status once (for manual checks)
 */
export async function checkPaymentStatus(orderId) {
	try {
		const paymentRef = doc(db, 'payments', orderId);
		const snapshot = await getDoc(paymentRef);

		if (snapshot.exists()) {
			const data = snapshot.data();
			return data.status === 'paid' ? 'paid' : 'pending';
		}
		return 'pending';
	} catch (error) {
		console.warn('Check payment error:', error);
		return 'error';
	}
}

/**
 * Initiate the full payment flow:
 * 1. Generate order ID
 * 2. Start Firestore listener
 * 3. Return QR code URL + order ID
 */
export function initiatePayment() {
	const orderId = generateOrderId();
	const qrUrl = getQRCodeUrl(orderId);

	// Update store
	useItemStore.getState().startPayment(orderId);

	// Start listening for payment confirmation
	const unsubscribe = listenForPayment(
		orderId,
		// onSuccess
		() => {
			useItemStore.getState().completePayment();
		},
		// onError
		() => {
			// Don't fail immediately on listener error, could be temporary
			console.warn('Payment listener had an error for order:', orderId);
		}
	);

	// Store unsubscribe for cleanup
	useItemStore.getState().setPollingInterval(unsubscribe);

	return { orderId, qrUrl, price: ITEM_PRICE };
}

/**
 * Cancel the current payment flow
 */
export function cancelPayment() {
	const state = useItemStore.getState();
	// pollingInterval here is actually the unsubscribe function from onSnapshot
	if (state.pollingInterval) {
		if (typeof state.pollingInterval === 'function') {
			state.pollingInterval(); // call unsubscribe
		} else {
			clearInterval(state.pollingInterval);
		}
	}
	state.resetPayment();
}
