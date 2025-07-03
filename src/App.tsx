import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useEventListener, useHover } from "usehooks-ts";
import styles from "./App.module.css";
import shopImage from "./assets/shop.png?inline";
import { generateShop, itemCache, items, type ShopContents, toolCache, trinketCache, type Item, type TrinketItem } from "./data/items";
import { digTile, digTileModifiers } from "./util/tiles";

const sampleSize = <T,>(arr: T[], n: number): T[] => {
	const remaining = arr.slice(0);
	const values: T[] = [];
	for (let i = 0; i < n; i++) {
		if (remaining.length <= 0) break;
		values.push(remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0]);
	}
	return values;
};

const createTile = (level: number) => {
	// if (Math.random() > 0.95) {
	// 	//if (Math.random() > 0.9) return "R";
	// 	return "S";
	// }
	return Math.random() < 1 / 2 + level * 0.01 ? "O" : "X";
};

const createGrid = (level: number) => {
	const tiles: { i: number; j: number; v: string; id: string }[] = [];
	for (let i = 0; i < 14; i++) for (let j = 0; j < 9; j++) tiles.push({ i, j, v: createTile(level), id: crypto.randomUUID() });
	if (level >= 3)
		for (const tile of sampleSize(tiles, 7 + Math.min(level - 3, 50))) {
			tile.v = "S";
		}
	if (level >= 10)
		for (const tile of sampleSize(tiles, 7 + Math.min(level - 10, 25))) {
			tile.v = "R";
		}
	if (Math.random() <= 1 / 3)
		for (const tile of sampleSize(tiles, Math.floor(Math.random() * 3) + 1)) {
			tile.v = "E";
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
let mouseX = 0;
let mouseY = 0;
export const CursorAnchor = ({ children }: { children: ReactNode }) => {
	const [mousePos, setMousePos] = useState([mouseX, mouseY]);
	useEventListener("mousemove", e => {
		setMousePos([e.x, e.y]);
		mouseX = e.x;
		mouseY = e.y;
	});
	return (
		(mousePos[0] !== 0 || mousePos[1] !== 0) && (
			<div className={styles.cursorAnchor} style={{ left: `${mousePos[0]}px`, top: `${mousePos[1]}px` }}>
				{children}
			</div>
		)
	);
};
export const ItemBox = ({
	item,
	anchor,
	onClick,
	data,
	showCost,
}: {
	item: Item;
	anchor: "bottom" | "right";
	onClick: (e: React.MouseEvent) => void;
	showCost?: boolean;
	data?: { uses?: number; unusable?: boolean; selected?: boolean };
}) => {
	return (
		<TooltipContainer
			anchor={anchor}
			contents={
				<>
					<div className={styles.tooltipLabel} data-type={item.category}>
						{item.category[0].toUpperCase()}
						{item.category.slice(1)}
					</div>
					<h1 data-rarity={item.rarity}>{item.name}</h1>
					<div>{item.description(null)}</div>
					{item.category === "trinket" && (
						<div className={styles.trinketUses} data-unusable={data?.unusable || null}>
							{data?.uses ?? "∞"}/{item.uses ?? "∞"} Uses
						</div>
					)}
					{showCost && (
						<div className={styles.itemCost} data-unaffordable={data?.unusable || null}>
							${item.cost}
						</div>
					)}
				</>
			}
		>
			<div className={styles.tool} data-selected={data?.selected === true ? true : null} onClick={onClick} data-unusable={data?.unusable || null}>
				{item.id}
			</div>
		</TooltipContainer>
	);
};
type GameStage = "play" | "shop";
const DEBUG = true;
function App() {
	if (DEBUG) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		useEventListener("keypress", e => {
			if (e.key === "i") {
				setTools(items.filter(x => x.category === "tool").map(x => x.id));
				setTrinkets(items.filter(x => x.category === "trinket").map(x => x.id));
			}
			if (e.key === "s") {
				setMoney(100);
				openShop();
			}
		});
	}
	const [level, setLevel] = useState(1);
	const [board, setBoard] = useState(createGrid(1));
	const [hovered, setHovered] = useState<null | [number, number]>();
	const [active, setActive] = useState<null | [number, number]>();
	const [score, setScore] = useState(0);
	const [moves, setMoves] = useState(5);
	const [combo, setCombo] = useState(0);
	const [maxCombo, setMaxCombo] = useState(0);
	const [tools, setTools] = useState<string[]>(["shovel"]);
	const [trinkets, setTrinkets] = useState<string[]>([]);
	const [trinketIndex, setTrinketIndex] = useState(-1);
	const [trinketUses, setTrinketUses] = useState({} as Record<string, number>);
	const [toolIndex, setToolIndex] = useState(0);
	const [energy, setEnergy] = useState(0);
	const [stage, setStage] = useState<GameStage>("play");
	const [levelComplete, setLevelComplete] = useState(false);
	const [targetRow, setTargetRow] = useState(5);
	const [money, setMoney] = useState(0);
	const [shopContents, setShopContents] = useState<ShopContents | null>(null);
	const topRow = useMemo(() => {
		for (let i = 0; i < 14; i++) {
			if (!board.some(x => x.i === i)) continue;
			return i;
		}
		return 14;
	}, [board]);
	const maxEnergy = 5;
	const currentTool = useMemo(() => toolCache[tools[toolIndex]], [tools, toolIndex]);
	const currentTrinket = useMemo(() => {
		const id = trinkets[trinketIndex];
		if (!id || (trinketCache[id].uses && trinketUses[id] >= trinketCache[id].uses)) return null;
		return trinketCache[id];
	}, [trinkets, trinketIndex, trinketUses]) as TrinketItem | null;
	const [button, setButton] = useState<null | number>(null);
	const moneyGain = useMemo(() => {
		const gain: { text: string; amount: number }[] = [{ text: "Level Completion", amount: 2 }];
		if (energy >= maxEnergy) gain.push({ text: "Full Energy Bar", amount: 1 });
		if (board.length <= 0) gain.push({ text: "Full Clear", amount: 1 });
		if (maxCombo > 0) gain.push({ text: `Max Combo: ${maxCombo}`, amount: Math.ceil(maxCombo / 5) });
		if (score > 1000000) gain.push({ text: `Amazing Score`, amount: 2 });
		return gain;
	}, [board.length, energy, maxCombo, score]);
	const cache = useMemo(
		() =>
			board.reduce((l, c) => {
				l[c.i] ??= {};
				l[c.i][c.j] = c;
				return l;
			}, {} as Record<number, Record<number, { i: number; j: number; v: string; id: string }>>),
		[board]
	);
	const checkClears = (keepCombo: boolean, hasCleared: boolean, b: { i: number; j: number; v: string; id: string }[]) => {
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
			if (combo + removedRows > maxCombo) setMaxCombo(combo + removedRows);
			setScore(x => x + removedTiles * 1000 * (1 + (removedRows - 1) / 2) * (1 + combo / 2));
			if (topRow < targetRow) setMoves(x => x + 3 * removedRows);
			setEnergy(x => Math.min(maxEnergy, x + removedRows));
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
				checkClears(keepCombo, hasCleared || removedRows > 0, b);
			}, 250);
		else if (!hasCleared && !removedRows && !keepCombo) setCombo(0);
		if (b.length === 0) {
			setTimeout(() => {
				setLevelComplete(true);
			}, 500);
		}
	};
	const click = (ci: number, cj: number, b: number) => {
		if (b === 2 && energy <= 0) return;
		if (b === 2 && currentTrinket) return;
		if (moves <= 0) return;
		const modifiers: { energy?: number }[] = [];
		const flushModifiers = () => {
			for (const m of modifiers) {
				if (m.energy) setEnergy(x => x + m.energy!);
			}
		};
		if (currentTrinket) {
			const newBoard = currentTrinket.use(board, ci, cj, modifiers);
			setBoard(newBoard);
			checkClears(true, false, newBoard);
			setTrinketUses(x => ({ ...x, [currentTrinket.id]: (x[currentTrinket.id] ?? 0) + 1 }));
			setTrinketIndex(-1);
			flushModifiers();
			return;
		}
		const newBoard = board.flatMap(x =>
			(currentTrinket ?? currentTool).interacting(ci, cj, x.i, x.j) ? (b === 0 ? { ...x, v: digTileModifiers(x.v, modifiers) } : currentTool.ability.use(x, modifiers)) : x
		);
		checkClears(false, false, newBoard);
		setMoves(x => x - 1);
		if (b === 2) setEnergy(x => x - 1);
		flushModifiers();
	};
	useEffect(() => {
		if (stage !== "play" || levelComplete) return;
		if (moves === 0 || board.length === 0) {
			setTimeout(() => {
				setLevelComplete(true);
			}, 500);
		}
	}, [moves, board.length, stage, levelComplete]);
	const nextLevel = () => {
		setLevel(level + 1);
		setStage("play");
		setBoard(createGrid(level + 1));
		setMoves(5);
		setTargetRow(Math.min(5 + level, 14));
		setShopContents(null);
	};
	const openShop = () => {
		setStage("shop");
		setScore(0);
		setCombo(0);
		setEnergy(0);
		setTrinketUses({});
		setMaxCombo(0);
		setMoney(money + moneyGain.reduce((l, c) => l + c.amount, 0));
		setLevelComplete(false);
		setShopContents(generateShop(tools.concat(trinkets)));
	};
	useEventListener("mouseup", () => {
		setActive(null);
		setButton(null);
	});
	useEventListener("wheel", e => {
		e.preventDefault();
		setToolIndex(x => (x + tools.length + Math.sign(e.deltaY)) % tools.length);
	});
	return (
		<>
			{hovered && stage === "play" && (
				<CursorAnchor>
					<div className={styles.cursorMoves} data-trinket={currentTrinket?.name}>
						{currentTrinket ? (
							<>
								<div>
									<b>{currentTrinket.name}</b>
								</div>
								{currentTrinket.uses ? currentTrinket.uses - (trinketUses[currentTrinket.id] ?? 0) : "∞"}/{currentTrinket.uses ?? "∞"} Uses
							</>
						) : (
							<div>
								{moves} Move{moves === 1 ? "" : "s"} Left
							</div>
						)}
					</div>
				</CursorAnchor>
			)}
			<main className={styles.main} onContextMenu={e => e.preventDefault()}>
				<div className={styles.headerRows}>
					<div className={styles.levelRow}>
						<div>Level {level}</div>
					</div>
					<div className={styles.header}>
						{stage === "play" && (
							<>
								<AnimatePresence>
									<div className={styles.score}>
										<motion.div layout key={`score${score}`} initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}>
											{score}
										</motion.div>
									</div>
								</AnimatePresence>

								<div className={styles.moves} data-moves={moves}>
									{moves}
								</div>
							</>
						)}
						{stage === "shop" && (
							<>
								<AnimatePresence>
									<div className={styles.score}>
										<motion.div layout key={`score${score}`} initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}>
											SHOP
										</motion.div>
									</div>
								</AnimatePresence>
							</>
						)}
					</div>
					<div className={styles.comboRow}>
						{stage === "play" && (
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
												backgroundImage:
													combo <= 9
														? ""
														: combo <= 19
														? "linear-gradient(#aaaa00, #ecec67)"
														: combo <= 29
														? "linear-gradient(#007bee, #00dddd)"
														: combo <= 39
														? "linear-gradient(#ff0000, #00ff00, #0000ff)"
														: "linear-gradient(red,orange,yellow,green,blue,purple)",
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
						)}
						{stage === "shop" && (
							<div className={styles.combo} style={{ color: "#f1e390" }}>
								Buy and sell items!
							</div>
						)}
						<div className={styles.balance}>${money}</div>
					</div>
				</div>
				<div className={styles.inventory}>
					{trinkets.map((x, i) => {
						const unusable = trinketCache[x].uses && trinketUses[x] !== undefined && trinketUses[x] >= trinketCache[x].uses;
						return (
							<TooltipContainer
								anchor="bottom"
								contents={
									<>
										<div className={styles.tooltipLabel} data-type="trinket">
											Trinket
										</div>
										<h1 data-rarity={itemCache[x].rarity}>{itemCache[x].name}</h1>
										<div>{itemCache[x].description(null)}</div>
										<div className={styles.trinketUses} data-unusable={unusable || null}>
											{trinketCache[x].uses ? trinketCache[x].uses - (trinketUses[x] ?? 0) : "∞"}/{trinketCache[x].uses ?? "∞"} Uses
										</div>
									</>
								}
								key={x}
							>
								<div
									className={styles.tool}
									key={x}
									data-selected={trinketIndex === i ? true : null}
									onClick={() => !unusable && setTrinketIndex(x => (x === i ? -1 : i))}
									data-unusable={unusable || null}
								>
									{x}
								</div>
							</TooltipContainer>
						);
					})}
				</div>
				<div className={styles.center}>
					<AnimatePresence>
						{stage === "play" &&
							levelComplete &&
							(topRow >= targetRow ? (
								<motion.div className={styles.winScreen} layout initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
									<h1>Level Complete</h1>
									<p>
										You scored {score} points and cleared {topRow} rows.
									</p>
									{moneyGain.map(x => (
										<div className={styles.moneyGain} key={x.text}>
											<div className={styles.moneyGainLevel}>{x.text}</div>
											<div className={styles.moneyGainAmount}>${x.amount}</div>
										</div>
									))}
									<div className={styles.moneyGain}>
										<div className={styles.moneyGainLevel}>
											<b>Total</b>
										</div>
										<div className={styles.moneyGainAmount}>
											<b>${moneyGain.reduce((l, c) => l + c.amount, 0)}</b>
										</div>
									</div>
									<button onClick={openShop}>Go to Shop</button>
								</motion.div>
							) : (
								<motion.div className={styles.loseScreen} layout initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
									<h1>Game Over</h1>
									<p>You did not meet the line clearing requirement.</p>
									<button onClick={() => location.reload()}>Play Again</button>
								</motion.div>
							))}
					</AnimatePresence>
					<div className={styles.toolbar}>
						<motion.div layout className={styles.toolList}>
							{tools.map((x, i) => (
								<TooltipContainer
									anchor="right"
									contents={
										<>
											<div className={styles.tooltipLabel} data-type="tool">
												Tool
											</div>
											<h1 data-rarity={itemCache[x].rarity}>{itemCache[x].name}</h1>
											<div>{itemCache[x].description(null)}</div>
										</>
									}
									key={x}
								>
									<div className={styles.tool} key={x} data-selected={toolIndex === i ? true : null} onClick={() => setToolIndex(i)}>
										{x}
									</div>
								</TooltipContainer>
							))}
						</motion.div>
						<motion.div layout className={styles.toolAbilityBox}>
							<div className={styles.toolAbility}>
								<TooltipContainer
									anchor="right"
									contents={
										<>
											<div className={styles.tooltipLabel} data-type="ability">
												Tool Ability
											</div>
											<h1>{currentTool.ability.name}</h1>
											<div>{currentTool.ability.description}</div>
										</>
									}
								>
									<div className={styles.tool} data-selected>
										ability: {currentTool.ability.id}
									</div>
								</TooltipContainer>
							</div>
						</motion.div>
					</div>
					{stage === "play" && (
						<motion.div layout layoutId="center" className={styles.board} style={{ "--rows": 9 }} data-lost={moves === 0 ? true : null}>
							<motion.div className={styles.targetLine} initial={{ "--index": 0 }} animate={{ "--index": targetRow }} />
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
													setButton(e.button);
												}}
												onMouseUp={() => {
													setActive(null);
													setButton(null);
												}}
												style={{ gridRow: i + 1, gridColumn: j + 1 }}
												data-state={tile?.v ?? " "}
												data-hover={tile && hovered && (currentTrinket ?? currentTool).interacting(hovered[0], hovered[1], i, j) ? true : null}
												data-active={tile && active && (currentTrinket ?? currentTool).interacting(active[0], active[1], i, j) ? true : null}
												data-highlight={button === 2 && energy === 0 && !currentTrinket ? true : null}
												data-trinket={currentTrinket}
												className={styles.tile}
												key={tile?.id ?? `${i},${j}`}
											></motion.div>
										);
									})
								)}
							</AnimatePresence>
						</motion.div>
					)}
					{stage === "shop" && shopContents && (
						<motion.div layout layoutId="center" className={styles.shop}>
							<div className={styles.shopTop}>
								<div className={styles.shopLeft}>
									<img alt="Shop" className={styles.shopImage} src={shopImage} />
								</div>
								<div className={styles.shopRight}></div>
							</div>
							<div className={styles.shopBottom}>
								<div className={styles.shopRows}>
									{shopContents.main.map((x, i) => (
										<div className={styles.shopItem} key={x?.id ?? i}>
											<div>
												{x ? (
													<ItemBox
														item={x}
														anchor="bottom"
														onClick={() => {
															if (money < x.cost) return;
															setMoney(money - x.cost);
															if (x.category === "tool") setTools(tools.concat(x.id));
															else if (x.category === "trinket") setTrinkets(trinkets.concat(x.id));
															setShopContents({
																...shopContents,
																main: shopContents.main.map((y, j) => (i === j ? null : y)),
															});
														}}
														showCost
														data={{ unusable: money < x.cost }}
													/>
												) : (
													<div className={styles.sold}>
														<div className={styles.tool}>SOLD</div>
													</div>
												)}
											</div>
											<div className={styles.price} data-unusable={(x && money < x.cost) || null}>
												{x ? `$${x.cost}` : "-"}
											</div>
										</div>
									))}
								</div>
								<button onClick={nextLevel}>Next Level</button>
							</div>
						</motion.div>
					)}
					<motion.div
						layout
						className={styles.energyBar}
						style={{ "--max-energy": maxEnergy }}
						data-highlight={button === 2 && energy === 0 && !currentTrinket ? true : null}
					>
						<AnimatePresence>
							{[...Array(energy)].map((_, i) => (
								<motion.div className={styles.energyTile} key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} />
							))}
						</AnimatePresence>
					</motion.div>
				</div>
				<div className={styles.footer}>
					<AnimatePresence>
						{stage === "play" && topRow >= targetRow && (
							<motion.div layout initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
								You have completed the line requirement. You will no longer naturally regain moves.
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</main>
		</>
	);
}

export default App;
