import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useEventListener, useHover } from "usehooks-ts";
import styles from "./App.module.css";
import { itemCache, items } from "./data/items";

const sampleSize = <T,>(arr: T[], n: number): T[] => {
	const remaining = arr.slice(0);
	const values: T[] = [];
	for (let i = 0; i < n; i++) {
		if (remaining.length <= 0) break;
		values.push(remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0]);
	}
	return values;
};

const createTile = () => {
	// if (Math.random() > 0.95) {
	// 	//if (Math.random() > 0.9) return "R";
	// 	return "S";
	// }
	return Math.random() > 0.5 ? "O" : "X";
};

const createGrid = () => {
	const tiles: { i: number; j: number; v: string; id: string }[] = [];
	for (let i = 0; i < 14; i++) for (let j = 0; j < 9; j++) tiles.push({ i, j, v: createTile(), id: crypto.randomUUID() });
	for (const tile of sampleSize(tiles, 7)) {
		tile.v = "S";
	}
	for (let i = 0; i < 14; i++) {
		const row = tiles.filter(x => x.i === i);
		if (row.every(x => x.v === "X")) row[Math.floor(Math.random() * row.length)].v = "O";
	}
	return tiles;
};

const TooltipContainer = ({ children, contents, anchor }: { children: ReactNode; contents: ReactNode; anchor?: "right" | "bottom" }) => {
	const ref = useRef<HTMLDivElement | null>(null);
	const isHovered = useHover(ref as RefObject<HTMLDivElement>);
	return (
		<div className={styles.itemBox} ref={ref}>
			{children}
			{isHovered && (
				<div className={styles.tooltipBox} data-anchor={anchor ?? "bottom"}>
					{contents}
				</div>
			)}
		</div>
	);
};


function App() {
	const [board, setBoard] = useState(createGrid());
	const [hovered, setHovered] = useState<null | [number, number]>();
	const [active, setActive] = useState<null | [number, number]>();
	const [score, setScore] = useState(0);
	const [moves, setMoves] = useState(5);
	const [combo, setCombo] = useState(0);
	const [tools, setTools] = useState<string[]>(items.filter(x => x.category === "tool").map(x => x.id));
	const [toolIndex, setToolIndex] = useState(0);
	const currentTool = useMemo(() => itemCache[tools[toolIndex]], [tools, toolIndex]);
	const targetRow = 5;
	const cache = useMemo(
		() =>
			board.reduce((l, c) => {
				l[c.i] ??= {};
				l[c.i][c.j] = c;
				return l;
			}, {} as Record<number, Record<number, { i: number; j: number; v: string; id: string }>>),
		[board]
	);
	const checkClears = (hasCleared: boolean, b: { i: number; j: number; v: string; id: string }[]) => {
		let removedTiles = 0;
		let removedRows = 0;
		for (let i = 0; i < 14; i++) {
			const row = b.filter(x => x.i === i);
			if (row.length && row.every(y => y.v === "X")) {
				const removed = b.filter(x => x.i === i);
				b = b.filter(x => x.i !== i);
				removedTiles += removed.length;
				removedRows++;
			}
		}
		if (removedRows > 0) {
			setCombo(x => x + removedRows);
			setScore(x => x + removedTiles * 1000 * (1 + (removedRows - 1) / 2) * (1 + combo / 2));
			setMoves(x => x + 3 * removedRows);
		}
		// Gravity
		let fall = false;
		for (let i = 0; i < 14; i++)
			for (let j = 0; j < 9; j++) {
				const tile = b.find(x => x.i === i && x.j === j);
				if (!tile) {
					if (!fall && b.some(x => x.j === j && x.i < i)) fall = true;
					b = b.map(x => (x.j === j && x.i < i ? { ...x, i: x.i + 1 } : x));
				}
			}
		setBoard(b);
		if (removedRows || fall)
			setTimeout(() => {
				checkClears(hasCleared || removedRows > 0, b);
			}, 250);
		else if (!hasCleared && !removedRows) setCombo(0);
	};
	const click = (ci: number, cj: number, b: number) => {
		if (moves <= 0) return;
		const changes: Record<string, string> = {
			O: "X",
			X: "O",
			S: "O",
			R: "S",
		};
		const newBoard = board.flatMap(x => (currentTool.interacting(ci, cj, x.i, x.j) ? (b === 0 ? { ...x, v: changes[x.v] } : currentTool.ability.use(x)) : x));
		checkClears(false, newBoard);
		setMoves(x => x - 1);
	};
	useEventListener("mouseup", () => setActive(null));
	useEventListener("wheel", e => {
		e.preventDefault();
		setToolIndex(x => (x + tools.length + Math.sign(e.deltaY)) % tools.length);
	});
	return (
		<>
			<main className={styles.main} onContextMenu={e => e.preventDefault()}>
				<div className={styles.headerRows}>
					<div className={styles.header}>
						<AnimatePresence>
							<div className={styles.score}>
								<motion.div layout key={`score${score}`} initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}>
									{score}
								</motion.div>
							</div>
						</AnimatePresence>

						{moves === 0 && <div className={styles.loseMessage}>YOU LOST!</div>}
						<div className={styles.moves} data-moves={moves}>
							{moves}
						</div>
					</div>
					<div className={styles.comboRow}>
						<AnimatePresence>
							{combo >= 2 && (
								<div className={styles.combo}>
									<motion.div
										style={{
											backgroundColor:
												combo <= 2
													? "#aaaa00"
													: combo <= 3
													? "#dddd00"
													: combo <= 4
													? "#00dd00"
													: combo <= 5
													? "#00dddd"
													: combo <= 6
													? "#9999ee"
													: combo <= 7
													? "#aa00ee"
													: combo <= 8
													? "#ee00aa"
													: combo <= 9
													? "#ee0000"
													: "transparent",
											backgroundClip: "text",
										}}
										key={`combo${combo}`}
										initial={{ scale: 0.5 }}
										animate={{ scale: 1 }}
										exit={{ scale: 0.5 }}
									>
										X{combo} COMBO
									</motion.div>
								</div>
							)}
						</AnimatePresence>
					</div>
				</div>
				<div className={styles.inventory}></div>
				<div className={styles.center}>
					<div className={styles.toolbar}>
						<div className={styles.toolList}>
							{tools.map((x, i) => (
								<TooltipContainer
									anchor="right"
									contents={
										<>
											<div className={styles.tooltipLabel} data-type="tool">
												Tool
											</div>
											<h1>{itemCache[x].name}</h1>
											<p>{itemCache[x].description}</p>
										</>
									}
									key={x}
								>
									<div className={styles.tool} key={x} data-selected={toolIndex === i ? true : null} onClick={() => setToolIndex(i)}>
										{x}
									</div>
								</TooltipContainer>
							))}
						</div>
						<div className={styles.toolAbilityBox}>
							<div className={styles.toolAbility}>
								<TooltipContainer
									anchor="right"
									contents={
										<>
											<div className={styles.tooltipLabel} data-type="ability">
												Tool Ability
											</div>
											<h1>{currentTool.ability.name}</h1>
											<p>{currentTool.ability.description}</p>
										</>
									}
								>
									<div className={styles.tool} data-selected>
										ability: {currentTool.ability.id}
									</div>
								</TooltipContainer>
							</div>
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
											onMouseEnter={() => tile && setHovered([i, j])}
											onMouseLeave={() => setHovered(null)}
											onMouseDown={e => {
												if (!tile) return;
												click(i, j, e.button);
												setActive([i, j]);
											}}
											onMouseUp={() => setActive(null)}
											style={{ gridRow: i + 1, gridColumn: j + 1 }}
											data-state={tile?.v ?? " "}
											data-hover={tile && hovered && currentTool.interacting(hovered[0], hovered[1], i, j) ? true : null}
											data-active={tile && active && currentTool.interacting(active[0], active[1], i, j) ? true : null}
											className={styles.tile}
											key={tile?.id ?? `${i},${j}`}
										></motion.div>
									);
								})
							)}
						</AnimatePresence>
					</div>
					<div className={styles.energyBar}>
						
					</div>
				</div>
			</main>
		</>
	);
}

export default App;
