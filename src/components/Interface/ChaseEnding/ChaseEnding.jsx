/**
 * ChaseEnding.jsx
 *
 * UI cho toàn bộ Chase Ending sequence:
 * - Countdown overlay (3, 2, 1, Sẵn sàng, CHẠY!)
 * - Progress bar 30s đếm ngược
 * - Dynamic subtitles khi gần cuối
 * - Vignette effect khi nguy hiểm
 *
 * Component này lắng nghe custom event 'chaseUIUpdate' để
 * tự render lại mà không cần re-render toàn bộ scene.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import './ChaseEnding.css';
import { CHASE_DURATION, SUBTITLE_TRIGGER_TIME } from '../../../hooks/useChaseEnding';

// Subtitle text (không dùng localization cho đơn giản)
const SUBTITLE_ANTAGONIST = '??? : Ngươi nghĩ ngươi chạy thoát được ta sao...';
const SUBTITLE_PLAYER = 'TÔI : ...';
const CHAR_DELAY_MS = 38;

/* ── Typewriter hook nhẹ ── */
function useTypewriter(text, active) {
	const [displayed, setDisplayed] = useState('');
	const rafRef = useRef(null);
	const chunkRef = useRef(0);

	useEffect(() => {
		if (!active || !text) {
			setDisplayed('');
			chunkRef.current = 0;
			return;
		}

		chunkRef.current = 0;
		let lastTime = 0;

		const tick = (ts) => {
			if (!lastTime) lastTime = ts;
			const elapsed = ts - lastTime;
			const steps = Math.floor(elapsed / CHAR_DELAY_MS);
			if (steps > 0) {
				lastTime = ts - (elapsed % CHAR_DELAY_MS);
				chunkRef.current = Math.min(chunkRef.current + steps, text.length);
				setDisplayed(text.slice(0, chunkRef.current));
				if (chunkRef.current >= text.length) return;
			}
			rafRef.current = requestAnimationFrame(tick);
		};

		setDisplayed('');
		rafRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafRef.current);
	}, [text, active]);

	return { displayed, isTyping: displayed.length < (text?.length ?? 0) };
}

/* ── Countdown display ── */
function CountdownDisplay({ value }) {
	// Dùng key trick để trigger re-animation khi value thay đổi
	const key = `cd-${value}`;

	if (value === 'ready') {
		return (
			<div key={key} className="chase-countdown-ready">
				Sẵn sàng
			</div>
		);
	}
	if (value === 'go') {
		return (
			<div key={key} className="chase-countdown-go">
				CHẠY!
			</div>
		);
	}
	return (
		<div key={key} className="chase-countdown-number">
			{value}
		</div>
	);
}

/* ── Subtitle Panel ── */
function SubtitlePanel({ phase }) {
	const isAntagonist = phase === 'antagonist';
	const isPlayer = phase === 'player';

	const text = isAntagonist
		? SUBTITLE_ANTAGONIST
		: isPlayer
		? SUBTITLE_PLAYER
		: '';

	const speakerName = isAntagonist ? '???' : 'TÔI';

	const { displayed, isTyping } = useTypewriter(text, isAntagonist || isPlayer);

	if (!text) return null;

	return (
		<div className="chase-subtitle-panel">
			<div className="chase-subtitle-name">
				<span>{speakerName}</span>
			</div>
			<div className="chase-subtitle-textbox">
				<div className="chase-subtitle-text">
					{displayed}
					{isTyping && <span className="cursor" />}
				</div>
			</div>
		</div>
	);
}

/* ── Main ChaseEnding component ── */
export default function ChaseEnding({ chaseUIRef }) {
	// Lưu snapshot UI state để React render
	const [uiState, setUiState] = useState(() => ({
		phase: chaseUIRef?.current?.phase ?? 'countdown',
		countdownValue: chaseUIRef?.current?.countdownValue ?? 3,
		timeRemaining: chaseUIRef?.current?.timeRemaining ?? CHASE_DURATION,
		subtitlePhase: chaseUIRef?.current?.subtitlePhase ?? 'none',
	}));

	// Lắng nghe custom event từ hook để cập nhật UI
	const syncUI = useCallback(() => {
		if (!chaseUIRef?.current) return;
		setUiState({
			phase: chaseUIRef.current.phase,
			countdownValue: chaseUIRef.current.countdownValue,
			timeRemaining: chaseUIRef.current.timeRemaining,
			subtitlePhase: chaseUIRef.current.subtitlePhase,
		});
	}, [chaseUIRef]);

	// Cập nhật UI theo event + interval (vì timer cần cập nhật liên tục)
	useEffect(() => {
		window.addEventListener('chaseUIUpdate', syncUI);

		// Cập nhật timer mỗi 100ms mà không cần event
		const interval = setInterval(syncUI, 100);

		return () => {
			window.removeEventListener('chaseUIUpdate', syncUI);
			clearInterval(interval);
		};
	}, [syncUI]);

	const { phase, countdownValue, timeRemaining, subtitlePhase } = uiState;

	const isRunning = phase === 'running';
	const isCountdown = phase === 'countdown';
	const progressPercent = Math.max(0, (timeRemaining / CHASE_DURATION) * 100);
	const isWarning = timeRemaining <= 8;

	return (
		<>
			{/* Vignette effect */}
			{isRunning && (
				<div className={`chase-vignette ${isWarning ? 'warning' : ''}`} />
			)}

			{/* Countdown overlay */}
			{isCountdown && (
				<div className="chase-countdown-backdrop">
					<CountdownDisplay value={countdownValue} />
				</div>
			)}

			{/* Progress bar + timer label (chỉ hiện khi đang chạy) */}
			{isRunning && (
				<>
					<div className="chase-timer-bar-wrapper">
						<div className="chase-timer-bar-track">
							<div
								className={`chase-timer-bar-fill ${isWarning ? 'warning' : ''}`}
								style={{ width: `${progressPercent}%` }}
							/>
						</div>
					</div>
					<div className={`chase-timer-label ${isWarning ? 'warning' : ''}`}>
						{Math.ceil(timeRemaining)}s
					</div>
				</>
			)}

			{/* Dynamic subtitles */}
			{isRunning && subtitlePhase !== 'none' && (
				<SubtitlePanel phase={subtitlePhase} />
			)}
		</>
	);
}
