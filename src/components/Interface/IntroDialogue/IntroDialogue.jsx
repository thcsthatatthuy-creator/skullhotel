import { useState, useEffect, useRef, useCallback } from 'react';
import { getAudioInstance } from '../../../utils/audio';
import './IntroDialogue.css';

/* ─── KỊCH BẢN ──────────────────────────────── */
const SCRIPT = [
	{ speaker: '???', text: 'Ohh... người giúp việc mới à...' },
	{
		speaker: 'TÔI',
		text: 'Vâng thưa ngài, tôi đến đây để nhận việc theo như bảng tuyển dụng của ngài đưa ra. Không biết ngài có yêu cầu gì không nhỉ?',
	},
	{
		speaker: '???',
		text: 'Tốt, có chí khí đấy. Mỗi ngày ngươi cần dọn dẹp 8 / 20 căn phòng theo đúng nhiệm vụ đã ghi trong bản nhiệm vụ. NHƯNG hãy thật lưu ý — 1/2 số phòng ở đây đã bị nhiễm bệnh.',
	},
	{
		speaker: '???',
		text: 'Hãy cẩn trọng với từng bước chân của mình. Và... đừng tò mò về những âm thanh lạ bên ngoài phòng. Đó chỉ là tiếng gió thôi.',
	},
	{ speaker: 'TÔI', text: 'Vậy tôi cần lưu ý gì không?' },
	{
		speaker: '???',
		text: 'Nếu thấy sinh vật lạ trong phòng đừng hoảng sợ — đó chỉ là những du khách chưa rời khỏi phòng thôi. Hãy lặng lẽ rời khỏi phòng và NHỚ ĐÓNG CỬA.',
	},
	{ speaker: 'TÔI', text: 'Vậy... tiền lương thì sao...' },
	{
		speaker: '???',
		text: 'Cái đó ngươi không cần phải lo. Chỉ cần dọn xong 8 căn phòng, 100 triệu sẽ thuộc về ngươi. Ngươi còn thắc mắc gì không?',
		showOptions: true,
	},
];

const OPTIONS = [
	{ id: 'controls', label: 'Cách chơi' },
	{ id: 'guide',    label: 'Hướng dẫn chơi' },
	{ id: 'lau',      label: 'Cách lọ bằng hai tay' },
	{ id: 'ready',    label: 'Triển luôn, sợ gì!' },
];

const OPTION_REPLIES = {
	controls: {
		speaker: '???',
		text: 'W / A / S / D để di chuyển. Di chuột để xoay camera. Space để nhảy. Tab mở cài đặt. Chuột phải để nghe ngóng. Chuột trái hoặc E để tương tác. Còn thắc mắc gì không?',
		showOptions: true,
	},
	guide: {
		speaker: '???',
		text: 'Vào từng phòng và hoàn thành nhiệm vụ — dọn giường, bổ sung xà phòng, mở cửa sổ, dọn đồ ăn thừa, dọn phòng tắm. Kiểm tra bảng nhiệm vụ để biết còn sót gì. Còn thắc mắc gì nữa không?',
		showOptions: true,
	},
	lau: {
		speaker: '???',
		text: '... Nhân viên của tôi mà cũng cần phải hỏi câu này sao. Nếu không biết, hãy hỏi những vị khách ở đây. Còn thắc mắc gì nữa không?',
		showOptions: true,
	},
	ready: {
		speaker: '???',
		text: 'Được rồi! Hãy hoàn thành nhiệm vụ thật tốt và ghi nhớ những quy tắc tôi đã đưa ra. CHÚC MAY MẮN!!!',
		isFinal: true,
	},
};

/* ─── COMPONENT ──────────────────────────────── */
const IntroDialogue = ({ onFinish }) => {
	const [scriptIndex, setScriptIndex]     = useState(0);
	const [displayedText, setDisplayedText] = useState('');
	const [isTyping, setIsTyping]           = useState(true);
	const [currentEntry, setCurrentEntry]   = useState(SCRIPT[0]);
	const [isFadingOut, setIsFadingOut]     = useState(false);
	const [showOptions, setShowOptions]     = useState(false);
	const [focusedOption, setFocusedOption] = useState(0);

	const rafRef       = useRef(null);
	const lastTickRef  = useRef(0);
	const fullTextRef  = useRef(SCRIPT[0].text);
	const chunkRef     = useRef(0);
	const onFinishRef  = useRef(onFinish);   // stable ref — avoids callback churn
	const scriptIdxRef = useRef(0);          // mirror of scriptIndex for rAF closure

	// Keep ref in sync
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
	}, []);          // no deps → stable forever

	/* ── typing via rAF ── */
	const startTyping = useCallback(
		(entry) => {
			cancelAnimationFrame(rafRef.current);

			setCurrentEntry(entry);
			setIsTyping(true);
			setShowOptions(false);
			setFocusedOption(0);
			fullTextRef.current = entry.text;
			chunkRef.current    = 0;

			let lastTime = 0;
			const CHAR_DELAY = 28;

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
						if (entry.showOptions) setShowOptions(true);
						if (entry.isFinal)    triggerFinish();
						return;
					}
				}
				rafRef.current = requestAnimationFrame(tick);
			};

			// clear text first, then start
			setDisplayedText('');
			rafRef.current = requestAnimationFrame(tick);
		},
		[playTick, triggerFinish]   // stable — triggerFinish has no deps
	);

	/* ── init: only once ── */
	useEffect(() => {
		startTyping(SCRIPT[0]);
		return () => cancelAnimationFrame(rafRef.current);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	/* ── advance / skip ── */
	const advance = useCallback(() => {
		if (isFadingOut) return;

		if (isTyping) {
			cancelAnimationFrame(rafRef.current);
			chunkRef.current = fullTextRef.current.length;
			setDisplayedText(fullTextRef.current);
			setIsTyping(false);
			if (currentEntry.showOptions) setShowOptions(true);
			if (currentEntry.isFinal)    triggerFinish();
			return;
		}

		if (showOptions) return;

		const next = scriptIdxRef.current + 1;
		if (next < SCRIPT.length) {
			scriptIdxRef.current = next;
			setScriptIndex(next);
			startTyping(SCRIPT[next]);
		}
	}, [isFadingOut, isTyping, showOptions, currentEntry, startTyping, triggerFinish]);

	/* ── option select ── */
	const handleOption = useCallback(
		(id) => {
			setShowOptions(false);
			startTyping(OPTION_REPLIES[id]);
		},
		[startTyping]
	);

	/* ── keyboard: Enter advance, Esc skip all ── */
	useEffect(() => {
		const onKey = (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				if (showOptions) {
					handleOption(OPTIONS[focusedOption].id);
				} else {
					advance();
				}
			}
			if (e.key === 'Escape') {
				e.preventDefault();
				triggerFinish();
			}
			if (showOptions) {
				if (e.key === 'ArrowUp') {
					e.preventDefault();
					setFocusedOption((p) => (p - 1 + OPTIONS.length) % OPTIONS.length);
				}
				if (e.key === 'ArrowDown') {
					e.preventDefault();
					setFocusedOption((p) => (p + 1) % OPTIONS.length);
				}
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [advance, showOptions, focusedOption, handleOption, triggerFinish]);

	const fadeCls = isFadingOut ? ' fading-out' : '';

	return (
		<>
			{/* Blurred semi-transparent backdrop */}
			<div 
				className={`intro-backdrop${fadeCls}`} 
				onClick={!showOptions ? advance : undefined}
			/>

			{/* ESC hint top-right */}
			<div
				className="intro-esc-hint"
				onClick={triggerFinish}
				role="button"
				tabIndex={-1}
			>
				<kbd>ESC</kbd>
				<span>BỎ QUA</span>
			</div>

			{/* Bottom panel */}
			<div className={`intro-panel${fadeCls}`}>
				{/* Speaker name tab */}
				<div className="intro-name-tab">
					<span>{currentEntry.speaker}</span>
				</div>

				{/* Text box */}
				<div
					className="intro-textbox"
					onClick={!showOptions ? advance : undefined}
					style={{ cursor: showOptions ? 'default' : 'pointer' }}
				>
					{/* Dialogue text */}
					<div className="intro-dialogue-text">
						{displayedText}
						{isTyping && <span className="cursor" />}
					</div>

					{/* Options */}
					{showOptions && (
						<div className="intro-options">
							{OPTIONS.map((opt, i) => (
								<button
									key={opt.id}
									className={`intro-option-btn${focusedOption === i ? ' focused' : ''}`}
									onClick={(e) => {
										e.stopPropagation();
										handleOption(opt.id);
									}}
									onMouseEnter={() => setFocusedOption(i)}
								>
									{opt.label}
								</button>
							))}
						</div>
					)}

					{/* Enter hint + arrow */}
					{!showOptions && !isTyping && !currentEntry.isFinal && (
						<div className="intro-arrow">▶</div>
					)}

					{/* Key hints inside box */}
					{!showOptions && (
						<div className="intro-keys-hint">
							{isTyping ? (
								<span className="intro-key">
									<kbd>ENTER</kbd> bỏ qua
								</span>
							) : (
								<span className="intro-key">
									<kbd>ENTER</kbd> tiếp tục
								</span>
							)}
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default IntroDialogue;
