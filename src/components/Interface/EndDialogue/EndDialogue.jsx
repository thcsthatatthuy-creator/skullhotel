import { useState, useEffect, useRef, useCallback } from 'react';
import { getAudioInstance } from '../../../utils/audio';
import './EndDialogue.css';

/* ─── KỊCH BẢN ──────────────────────────────── */
const SCRIPT = [
	{ speaker: 'TÔI', text: 'Ahhhh, tôi không muốn ở nơi này một giây nào nữaaa, hãy cho tôi rời đi. Tôi không cần tiền nữa chỉ cần cho tôi đi là được. LÀM ƠNNN !!!' },
	{ speaker: '???', text: 'Ngươi nghĩ đây là chỗ muốn đi là đi muốn đến là đến sao...' },
	{ speaker: 'TÔI', text: 'Chẳng phải ngài đã nói chỉ cần dọn 8/20 căn phòng là sẽ được rời đi và nhận tiền thưởng sao ???' },
	{ speaker: '???', text: 'Hahahaahahaaaaa (cười gian mãnh)' },
	{ speaker: '???', text: 'Chưa ai từng làm ở đây mà có thể rời đi an toàn cả, mày nghĩ mày được đi sao, mày đã biết quá nhiều bí mật ở đây rồii' },
	{ speaker: 'TÔI', text: 'Tôi hứa khi ra ngoài sẽ không hé răng dù chỉ nửa lời về khách sạn này. Làm ơn cho tôi rời đi đi mà' },
	{ speaker: '???', text: 'Cách duy nhất để giữ được bí mật đó là thủ tiêu người giữ bí mật. Thôi không dài dòng với mày nữa. CHẾT ĐI !', isFinal: true },
];

/* ─── COMPONENT ──────────────────────────────── */
const EndDialogue = ({ onFinish }) => {
	const [scriptIndex, setScriptIndex]     = useState(0);
	const [displayedText, setDisplayedText] = useState('');
	const [isTyping, setIsTyping]           = useState(true);
	const [currentEntry, setCurrentEntry]   = useState(SCRIPT[0]);
	const [isFadingOut, setIsFadingOut]     = useState(false);

	const rafRef       = useRef(null);
	const lastTickRef  = useRef(0);
	const fullTextRef  = useRef(SCRIPT[0].text);
	const chunkRef     = useRef(0);
	const onFinishRef  = useRef(onFinish);
	const scriptIdxRef = useRef(0);

	useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

	/* ── sound ── */
	const playTick = useCallback(() => {
		const now = Date.now();
		if (now - lastTickRef.current < 70) return;
		lastTickRef.current = now;
		const snd = getAudioInstance('menu');
		if (snd) {
			snd.currentTime = 0;
			snd.volume = 0.15;
			snd.play().catch(() => {});
		}
	}, []);

	/* ── finish ── */
	const triggerFinish = useCallback(() => {
		setIsFadingOut(true);
		setTimeout(() => onFinishRef.current?.(), 500);
	}, []);

	/* ── typing via rAF ── */
	const startTyping = useCallback(
		(entry) => {
			cancelAnimationFrame(rafRef.current);

			setCurrentEntry(entry);
			setIsTyping(true);
			fullTextRef.current = entry.text;
			chunkRef.current    = 0;

			let lastTime = 0;
			const CHAR_DELAY = 32;

			const tick = (ts) => {
				if (!lastTime) lastTime = ts;
				const elapsed = ts - lastTime;
				const steps = Math.floor(elapsed / CHAR_DELAY);

				if (steps > 0) {
					lastTime = ts - (elapsed % CHAR_DELAY);
					chunkRef.current = Math.min(
						chunkRef.current + steps,
						entry.text.length
					);
					setDisplayedText(entry.text.slice(0, chunkRef.current));
					playTick();

					if (chunkRef.current >= entry.text.length) {
						setIsTyping(false);
						// Tự động kết thúc nếu là câu cuối, delay 2 giây cho kịch tính
						if (entry.isFinal) {
							setTimeout(() => {
								triggerFinish();
							}, 2000);
						}
						return;
					}
				}
				rafRef.current = requestAnimationFrame(tick);
			};

			setDisplayedText('');
			rafRef.current = requestAnimationFrame(tick);
		},
		[playTick, triggerFinish]
	);

	/* ── init ── */
	useEffect(() => {
		startTyping(SCRIPT[0]);
		return () => cancelAnimationFrame(rafRef.current);
	}, [startTyping]);

	/* ── Interaction (Next line / Skip typing) ── */
	const handleNext = useCallback(() => {
		if (isFadingOut) return;

		// 1) if typing, skip to end of current text
		if (isTyping) {
			cancelAnimationFrame(rafRef.current);
			chunkRef.current = fullTextRef.current.length;
			setDisplayedText(fullTextRef.current);
			setIsTyping(false);
			
			// Trigger finish immediately if we skip to the end of the final line
			if (currentEntry.isFinal) {
				setTimeout(() => {
					triggerFinish();
				}, 1500);
			}
			return;
		}

		// 2) if done typing but wait for next line
		if (currentEntry.isFinal) return; // Cannot skip final wait manually

		const nextIdx = scriptIdxRef.current + 1;
		if (nextIdx < SCRIPT.length) {
			scriptIdxRef.current = nextIdx;
			setScriptIndex(nextIdx);
			startTyping(SCRIPT[nextIdx]);
		}
	}, [isTyping, isFadingOut, currentEntry, startTyping, triggerFinish]);

	/* ── global input ── */
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
				e.preventDefault();
				handleNext();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleNext]);

	return (
		<>
			<div className={`end-backdrop ${isFadingOut ? 'fading-out' : ''}`} />

			<div
				className={`end-panel ${isFadingOut ? 'fading-out' : ''}`}
				onPointerDown={handleNext}
			>
				{currentEntry.speaker && (
					<div className="end-name-tab">
						<span>{currentEntry.speaker}</span>
					</div>
				)}

				<div className="end-textbox">
					<div className="end-dialogue-text">
						{displayedText}
						{isTyping && <span className="cursor" />}
					</div>

					{!isTyping && !currentEntry.isFinal && (
						<div className="end-arrow">
							▼
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default EndDialogue;
