import { useMemo, useState } from "react";
import styles from "./App.module.css";
import { useEventListener } from "usehooks-ts";
import { AnimatePresence, motion } from "motion/react";

const createTile = () => {
	if (Math.random() > 0.95) {
		//if (Math.random() > 0.9) return "R";
		return "S";
	}
	return Math.random() > 0.5 ? "O" : "X";
};

const createGrid = () => {
	const tiles: { i: number; j: number; v: string; id: string }[] = [];
	for (let i = 0; i < 14; i++) for (let j = 0; j < 9; j++) tiles.push({ i, j, v: createTile(), id: crypto.randomUUID() });
	return tiles;
};

const interacting = (ci: number, cj: number, i: number, j: number) => {
	// return Math.abs(j - cj) <= 1 && Math.abs(i - ci) <= 1;
	return (i === ci && Math.abs(j - cj) <= 1) || (j === cj && Math.abs(i - ci) <= 1);
};

function App() {
	const [board, setBoard] = useState(createGrid());
	const [hovered, setHovered] = useState<null | [number, number]>();
	const [active, setActive] = useState<null | [number, number]>();
	const [score, setScore] = useState(0);
	const [moves, setMoves] = useState(5);
	const cache = useMemo(
		() =>
			board.reduce((l, c) => {
				l[c.i] ??= {};
				l[c.i][c.j] = c;
				return l;
			}, {} as Record<number, Record<number, { i: number; j: number; v: string; id: string }>>),
		[board]
	);
	const click = (ci: number, cj: number) => {
		if (moves <= 0) return;
		const changes: Record<string, string> = {
			O: "X",
			X: "O",
			S: "O",
			R: "S",
		};
		let newBoard = board.map(x => (interacting(ci, cj, x.i, x.j) ? { ...x, v: changes[x.v] } : x));
		let removedTiles = 0;
		let removedRows = 0;
		for (let i = 0; i < 14; i++) {
			const row = newBoard.filter(x => x.i === i);
			if (row.length && row.every(y => y.v === "X")) {
				const removed = newBoard.filter(x => x.i === i);
				newBoard = newBoard.filter(x => x.i !== i);
				removedTiles += removed.length;
				removedRows++;
			}
		}
		if (removedRows > 0) {
			setScore(x => x + removedTiles * 1000 * removedRows);
			setMoves(x => x + 3 * removedRows);
		}
		// Gravity
		for (let i = 0; i < 14; i++)
			for (let j = 0; j < 9; j++) {
				const tile = newBoard.find(x => x.i === i && x.j === j);
				if (!tile) {
					newBoard = newBoard.map(x => (x.j === j && x.i < i ? { ...x, i: x.i + 1 } : x));
				}
			}
		setBoard(newBoard);
		setMoves(x => x - 1);
	};
	useEventListener("mouseup", () => setActive(null));
	return (
		<>
			<main className={styles.main}>
				<div className={styles.header}>
					<AnimatePresence>
						<div className={styles.score}>
							<motion.div layout key={score} initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}>
								{score}
							</motion.div>
						</div>
					</AnimatePresence>
					{moves === 0 && <div className={styles.loseMessage}>YOU LOST!</div>}
					<div className={styles.moves} data-moves={moves}>
						{moves}
					</div>
				</div>
				<div className={styles.board} style={{ "--rows": 9 }} data-lost={moves === 0 ? true : null}>
					{moves <= 0 && <div className={styles.loseOverlay} />}
					<AnimatePresence>
						{[...Array(14)].map((_, i) =>
							[...Array(9)].map((_, j) => {
								const tile = cache[i]?.[j];
								return (
									<motion.div
										layout
										layoutId={tile?.id ?? `${i},${j}`}
										initial={{ opacity: 0, scale: 0 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0 }}
										onMouseEnter={() => setHovered([i, j])}
										onMouseLeave={() => setHovered(null)}
										onMouseDown={() => {
											click(i, j);
											setActive([i, j]);
										}}
										onMouseUp={() => setActive(null)}
										style={{ gridRow: i + 1, gridColumn: j + 1 }}
										data-state={tile?.v ?? " "}
										data-hover={hovered && interacting(hovered[0], hovered[1], i, j) ? true : null}
										data-active={active && interacting(active[0], active[1], i, j) ? true : null}
										className={styles.tile}
										key={tile?.id ?? `${i},${j}`}
									></motion.div>
								);
							})
						)}
					</AnimatePresence>
				</div>
			</main>
		</>
	);
}

export default App;
