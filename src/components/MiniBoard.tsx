import styles from "./MiniBoard.module.css";

export const MiniBoard = ({
	board,
}: {
	board: string[][] | { w: number; h: number; interacting: (ci: number, cj: number, i: number, j: number) => boolean; pos: [number, number]; char?: string };
}) => {
	const b =
		board instanceof Array ? board : [...Array(board.h)].map((_, i) => [...Array(board.w)].map((_, j) => (board.interacting(...board.pos, i, j) ? board.char ?? "O" : " ")));
	return (
		<div className={styles.miniBoard} style={{ "--rows": b[0].length }}>
			{b.map((x, i) => x.map((y, j) => <div key={`${i},${j}`} className={styles.miniBoardTile} data-tile={y} />))}
		</div>
	);
};
