import { create } from 'zustand';

const useJoysticksStore = create((set) => ({
	leftStickRef: { current: null },
	rightStickRef: { current: null },
	cameraSwipeDeltaRef: { current: { x: 0, y: 0 } },
	controls: {
		left: false,
		right: false,
		forward: false,
		backward: false,
		jump: false,
		action: false,
		run: false,
		crouch: false,
	},
	setControl: (control, value) =>
		set((state) => ({
			controls: {
				...state.controls,
				[control]: value,
			},
		})),
}));

export default useJoysticksStore;
