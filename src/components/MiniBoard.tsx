import styles from "./MiniBoard.module.css";

export const MiniBoard = ({ board }: { board: string[][] }) => {
	return (
		<div className={styles.miniBoard} style={{ "--rows": board[0].length }}>
			{board.map((x, i) => x.map((y, j) => <div key={`${i},${j}`} className={styles.miniBoardTile} data-tile={y} />))}
		</div>
	);
};
