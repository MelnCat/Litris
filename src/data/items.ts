export type ItemCategory = "tool";
export interface BaseItem {
	id: string;
	name: string;
	description: string;
}
export interface ToolItem extends BaseItem {
	category: "tool";
	interacting(ci: number, cj: number, i: number, j: number): boolean;
}
export type Item = ToolItem;
export const items = [
	{
		id: "shovel",
		name: "Shovel",
		category: "tool",
		description: "The basic digging tool. Digs in a cross shape.",
		interacting(ci: number, cj: number, i: number, j: number) {
			return (i === ci && Math.abs(j - cj) <= 1) || (j === cj && Math.abs(i - ci) <= 1);
		},
	},
	{
		id: "fork",
		name: "Fork",
		category: "tool",
		description: "Can you even dig with a fork? Digs in an X shape.",
		interacting(ci: number, cj: number, i: number, j: number) {
			return (Math.abs(j - cj) === 1 && Math.abs(i - ci) === 1) || (j === cj && i === ci);
		},
	},
] satisfies Item[];
export const itemCache = items.reduce((l, c) => {
	l[c.id] = c;
	return l;
}, {} as Record<string, Item>);
