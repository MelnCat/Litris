const changes: Record<string, string> = {
	O: "X",
	X: "O",
	S: "O",
	R: "S",
};

export const digTile = (tile: string) => changes[tile] ?? "O";