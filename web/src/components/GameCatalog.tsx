import type { Game } from '@indiegames-app/shared';
import { GameCard } from './GameCard';
import { InfiniteList } from './InfiniteList';

export function GameCatalog() {
  return (
    <InfiniteList<Game>
      endpoint="/games"
      title="Juegos Disponibles"
      renderItem={(game) => <GameCard game={game} />}
      getItemKey={(game) => game.id}
      emptyMessage="No hay más juegos disponibles"
    />
  );
}
