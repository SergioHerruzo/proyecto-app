import type { Game } from '@indiegames-app/shared';

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
      <h2>{game.title}</h2>
      <p>{game.description || 'Sin descripción'}</p>
      <p><strong>Precio:</strong> ${game.price}</p>
      <p><strong>Desarrollador:</strong> {game.owner}</p>
    </div>
  );
}
