import type { ReactNode } from "react";
import { MiniBoard } from "../components/MiniBoard";

export type ItemCategory = "tool";
export interface BaseItem {
	id: string;
	name: string;
	description: ReactNode;
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

export type Item = ToolItem;
export const items = [
	{
		id: "shovel",
		name: "Shovel",
		category: "tool",
		description: (
			<>
				<div>The basic digging tool. Digs in a plus shape.</div>
				<MiniBoard
					board={[
						[" ", "O", " "],
						["O", "O", "O"],
						[" ", "O", " "],
					]}
				/>
			</>
		),
		interacting(ci: number, cj: number, i: number, j: number) {
			return (i === ci && Math.abs(j - cj) <= 1) || (j === cj && Math.abs(i - ci) <= 1);
		},
		ability: {
			id: "ddig",
			name: "Devastating Dig",
			description: "Destroys all selected tiles.",
			use(tile) {
				if (tile.v !== "O" && tile.v !== "X") return tile;
				return [];
			},
		},
	},
	{
		id: "fork",
		name: "Fork",
		category: "tool",
		description: (
			<>
				<div>Can you even dig with a fork? Digs in a cross shape.</div>
				<MiniBoard
					board={[
						["O", " ", "O"],
						[" ", "O", " "],
						["O", " ", "O"],
					]}
				/>
			</>
		),
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
	},
] satisfies Item[];
export const itemCache = items.reduce((l, c) => {
	l[c.id] = c;
	return l;
}, {} as Record<string, Item>);
