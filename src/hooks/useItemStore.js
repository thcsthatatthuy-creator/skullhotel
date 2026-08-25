import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import useGame from './useGame';

const useItemStore = create(
	subscribeWithSelector((set, get) => ({
		// --- God Eye Item State ---
		godEyeOwned: (() => {
			try {
				return localStorage.getItem('godEyeOwned') === 'true';
			} catch (e) {
				return false;
			}
		})(),

		godEyeActive: false,

		// List of infected room indices (rooms with monsters)
		infectedRooms: [],

		// --- Payment State ---
		paymentOrderId: null,
		paymentStatus: 'idle', // 'idle' | 'pending' | 'success' | 'failed'
		pollingInterval: null,

		// --- Actions ---
		setGodEyeOwned: (value) => {
			try {
				localStorage.setItem('godEyeOwned', value ? 'true' : 'false');
			} catch (e) {}
			set({ godEyeOwned: value });
		},

		activateGodEye: () => {
			const state = get();
			if (state.godEyeOwned) {
				// Calculate infected rooms when activating
				get().calculateInfectedRooms();
				set({ godEyeActive: true });
			}
		},

		deactivateGodEye: () => {
			set({ godEyeActive: false });
		},

		toggleGodEye: () => {
			const state = get();
			if (!state.godEyeOwned) return;
			if (state.godEyeActive) {
				get().deactivateGodEye();
			} else {
				get().activateGodEye();
			}
		},

		calculateInfectedRooms: () => {
			const seedData = useGame.getState().seedData;
			if (!seedData) return;

			const seedEntries = Object.values(seedData);
			const infected = [];

			seedEntries.forEach((room, index) => {
				if (room.type && room.type !== 'empty') {
					infected.push(index);
				}
			});

			set({ infectedRooms: infected });
		},

		isRoomInfected: (roomIndex) => {
			return get().infectedRooms.includes(roomIndex);
		},

		// --- Payment Actions ---
		setPaymentStatus: (status) => set({ paymentStatus: status }),
		setPaymentOrderId: (orderId) => set({ paymentOrderId: orderId }),

		startPayment: (orderId) => {
			set({
				paymentOrderId: orderId,
				paymentStatus: 'pending',
			});
		},

		completePayment: () => {
			const state = get();
			// Stop polling if running
			if (state.pollingInterval) {
				clearInterval(state.pollingInterval);
			}
			set({
				paymentStatus: 'success',
				pollingInterval: null,
			});
			// Unlock the item
			get().setGodEyeOwned(true);
		},

		failPayment: () => {
			const state = get();
			if (state.pollingInterval) {
				clearInterval(state.pollingInterval);
			}
			set({
				paymentStatus: 'failed',
				pollingInterval: null,
			});
		},

		resetPayment: () => {
			const state = get();
			if (state.pollingInterval) {
				clearInterval(state.pollingInterval);
			}
			set({
				paymentOrderId: null,
				paymentStatus: 'idle',
				pollingInterval: null,
			});
		},

		setPollingInterval: (interval) => set({ pollingInterval: interval }),
	}))
);

export default useItemStore;
