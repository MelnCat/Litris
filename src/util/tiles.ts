const changes: Record<string, string> = {
	O: "X",
	X: "O",
	S: "O",
	R: "S",
};

export const digTile = (tile: string) => {
	if (tile === "E") {
		return { mod: { energy: 1 }, to: "O" };
	}
	return { to: changes[tile] ?? "O" };
};
export const digTileModifiers = (tile: string, modifiers: { energy?: number }[]) => {
	const dug = digTile(tile);
	if (dug.mod) modifiers.push(dug.mod);
	return dug.to;
}
export const isWeakTile = (tile: string) => tile === "O" || tile === "R";
