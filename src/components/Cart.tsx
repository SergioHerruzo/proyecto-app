import type { Game } from "../types/games"

interface CartProps {
  items: Game[]
  onRemove: (id: number) => void
  onContinueShopping: () => void
}

export default function Cart({ items, onRemove, onContinueShopping }: CartProps) {
  const total = items.reduce((sum, g) => sum + g.price, 0)

  return (
    <div className="cart-page">
      <h1 className="cart-title">Tu carro de la compra</h1>
      <p className="cart-count">{items.length} {items.length === 1 ? "artículo" : "artículos"}</p>

      {items.length === 0 ? (
        <div className="cart-empty">
          <p>No tienes juegos en el carrito.</p>
          <button className="btn-outline" onClick={onContinueShopping}>
            Explorar juegos
          </button>
        </div>
      ) : (
        <>
          <div className="cart-list">
            {items.map(game => (
              <div key={game.id} className="cart-item">
                <div
                  className="cart-item-image"
                  style={{ backgroundImage: `url(${game.image})` }}
                />
                <div className="cart-item-info">
                  <h3 className="cart-item-title">{game.title}</h3>
                  <p className="cart-item-genres">{game.genres.join(", ")}</p>
                </div>
                <div className="cart-item-right">
                  <div className="cart-item-prices">
                    {game.oldPrice && (
                      <span className="price-old">{game.oldPrice.toFixed(2)}€</span>
                    )}
                    <span className="cart-item-price">{game.price.toFixed(2)}€</span>
                  </div>
                  <button
                    className="cart-item-remove"
                    onClick={() => onRemove(game.id)}
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-footer">
            <div className="cart-total">
              <span className="cart-total-label">Total</span>
              <span className="cart-total-price">{total.toFixed(2)}€</span>
            </div>
            <div className="cart-actions">
              <button className="btn-outline" onClick={onContinueShopping}>
                Seguir comprando
              </button>
              <button className="btn-primary">
                Continuar al pago
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
