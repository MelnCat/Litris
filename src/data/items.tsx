import type { ReactNode } from "react";
import { MiniBoard } from "../components/MiniBoard";
import { digTile } from "../util/tiles";

export type ItemCategory = "tool" | "trinket";
export type ItemRarity = "common" | "rare";
export interface BaseItem {
	id: string;
	name: string;
	description(data: unknown): ReactNode;
	cost: number;
	rarity: ItemRarity;
}
export interface ToolItem extends BaseItem {
	category: "tool";
	interacting(ci: number, cj: number, i: number, j: number): boolean;
	ability: {
		id: string;
		name: string;
		description: ReactNode;
		use(tile: { i: number; j: number; v: string; id: string }): { i: number; j: number; v: string; id: string } | { i: number; j: number; v: string; id: string }[];
	};
}
export interface TrinketItem extends BaseItem {
	category: "trinket";
	interacting(ci: number, cj: number, i: number, j: number): boolean;
	use(board: { i: number; j: number; v: string; id: string }[], i: number, j: number): { i: number; j: number; v: string; id: string }[];
	uses?: number;
}

export type Item = ToolItem | TrinketItem;
export const items = [
	// Tools
	{
		id: "shovel",
		name: "Shovel",
		category: "tool",
		description() {
			return (
				<>
					<div>The basic digging tool. Digs in a plus shape.</div>
					<MiniBoard board={{ w: 3, h: 3, pos: [1, 1], interacting: this.interacting }} />
				</>
			);
		},
		interacting(ci: number, cj: number, i: number, j: number) {
			return (i === ci && Math.abs(j - cj) <= 1) || (j === cj && Math.abs(i - ci) <= 1);
		},
		ability: {
			id: "ddig",
			name: "Devastating Dig",
			description: "Destroys all weak selected tiles.",
			use(tile) {
				if (tile.v !== "O" && tile.v !== "X") return tile;
				return [];
			},
		},
		cost: 1,
		rarity: "common",
	},
	{
		id: "fork",
		name: "Fork",
		category: "tool",
		description() {
			return (
				<>
					<div>Can you even dig with a fork? Digs in a cross shape.</div>
					<MiniBoard board={{ w: 3, h: 3, pos: [1, 1], interacting: this.interacting }} />
				</>
			);
		},
		interacting(ci: number, cj: number, i: number, j: number) {
			return (Math.abs(j - cj) === 1 && Math.abs(i - ci) === 1) || (j === cj && i === ci);
		},
		ability: {
			id: "pprick",
			name: "Precision Prick",
			description: "Converts all selected tiles into marked tiles.",
			use(tile) {
				return { ...tile, v: "X" };
			},
		},
		cost: 4,
		rarity: "common",
	},
	// Trinkets
	{
		id: "bomb",
		name: "Bomb",
		category: "trinket",
		description() {
			return (
				<>
					<div>Destroys all weak tiles in a 3-tile circular radius.</div>
					<MiniBoard board={{ w: 5, h: 5, pos: [2, 2], interacting: this.interacting, char: "!" }} />
				</>
			);
		},
		uses: 1,
		interacting(ci, cj, i, j) {
			return Math.abs(ci - i) <= 2 && Math.abs(cj - j) <= 2 && !(Math.abs(ci - i) === 2 && Math.abs(cj - j) === 2);
		},
		use(board, i, j) {
			return board.filter(x => (x.v !== "O" && x.v !== "X") || !this.interacting(i, j, x.i, x.j));
		},
		cost: 6,
		rarity: "rare",
	},
	{
		id: "star",
		name: "Star",
		category: "trinket",
		description() {
			return (
				<>
					<div>Destroys all weak tiles in a cross.</div>
					<MiniBoard board={{ w: 5, h: 5, pos: [2, 2], interacting: this.interacting, char: "!" }} />
				</>
			);
		},
		uses: 1,
		interacting(ci, cj, i, j) {
			return Math.abs(ci - i) === Math.abs(cj - j);
		},
		use(board, i, j) {
			return board.filter(x => (x.v !== "O" && x.v !== "X") || !this.interacting(i, j, x.i, x.j));
		},
		cost: 5,
		rarity: "rare",
	},
	{
		id: "powerwash",
		name: "Powerwash",
		category: "trinket",
		description() {
			return (
				<>
					<div>Digs all tiles.</div>
					<MiniBoard board={{ w: 5, h: 5, pos: [2, 2], interacting: this.interacting }} />
				</>
			);
		},
		uses: 1,
		interacting(ci, cj, i, j) {
			return true;
		},
		use(board, i, j) {
			return board.map(x => ({ ...x, v: digTile(x.v) }));
		},
		cost: 10,
		rarity: "rare",
	},
	{
		id: "paint",
		name: "Paint",
		category: "trinket",
		description() {
			return (
				<>
					<div>Converts all tiles in a 3x3 square into marked tiles.</div>
					<MiniBoard board={{ w: 3, h: 3, pos: [1, 1], interacting: this.interacting }} />
				</>
			);
		},
		uses: 3,
		interacting(ci, cj, i, j) {
			return Math.abs(ci - i) <= 1 && Math.abs(cj - j) <= 1;
		},
		use(board, i, j) {
			return board.map(x => ({ ...x, v: this.interacting(i, j, x.i, x.j) ? "X" : x.v }));
		},
		cost: 5,
		rarity: "common",
	},
	{
		id: "confusion",
		name: "Confusion",
		category: "trinket",
		description() {
			return (
				<>
					<div>Shuffles the board.</div>
				</>
			);
		},
		uses: 1,
		interacting(ci, cj, i, j) {
			return true;
		},
		use(board, i, j) {
			const second = fisherYates(board);
			return second.map((x, i) => ({ ...x, i: board[i].i, j: board[i].j }));
		},
		cost: 7,
		rarity: "common",
	},
	{
		id: "solarstrike",
		name: "Solar Strike",
		category: "trinket",
		description() {
			return (
				<>
					<div>Destroys all weak tiles in a plus shape.</div>
					<MiniBoard board={{ w: 5, h: 5, pos: [2, 2], interacting: this.interacting, char: "!" }} />
				</>
			);
		},
		uses: 1,
		interacting(ci, cj, i, j) {
			return ci === i || cj === j;
		},
		use(board, i, j) {
			return board.filter(x => (x.v !== "O" && x.v !== "X") || !this.interacting(i, j, x.i, x.j));
		},
		cost: 7,
		rarity: "rare",
	},

] satisfies Item[];
export const generateItem = (filter: (item: Item) => boolean = () => true, amount: number = 1) => {
	const pool = items.filter(x => filter(x));
	let weighted = pool.map(x => ({ id: x.id, weight: x.rarity === "common" ? 1 : x.rarity === "rare" ? 0.1 : 0 }));
	const out: Item[] = [];
	for (let i = 0; i < amount; i++) {
		const total = weighted.reduce((l, c) => l + c.weight, 0);
		if (total === 0) return out;
		const cumulative = weighted.reduce((l, c) => l.concat({ id: c.id, cumulative: (l.at(-1)?.cumulative ?? 0) + c.weight }), [] as { id: string; cumulative: number }[]);
		const random = Math.random() * total;
		const found = cumulative.find(x => random <= x.cumulative);
		if (!found) return out;
		weighted = weighted.filter(x => x.id !== found.id);
		out.push(itemCache[found.id]);
	}
	return out;
};
export const generateShop = (tools: string[]) => {
	return {
		main: generateItem(x => !tools.includes(x.id), 3)
	}
};
export interface ShopContents {
	main: (Item | null)[];
}

const fisherYates = <T,>(list: readonly T[]) => {
	const arr = [...list];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
};
export const itemCache = items.reduce((l, c) => {
	l[c.id] = c;
	return l;
}, {} as Record<string, Item>);
export const toolCache = items
	.filter(x => x.category === "tool")
	.reduce((l, c) => {
		l[c.id] = c;
		return l;
	}, {} as Record<string, ToolItem>);
export const trinketCache = items
	.filter(x => x.category === "trinket")
	.reduce((l, c) => {
		l[c.id] = c;
		return l;
	}, {} as Record<string, TrinketItem>);
