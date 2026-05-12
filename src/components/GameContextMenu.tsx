import { useEffect, useRef } from "react"
import "../styles/GameContextMenu.css"

export interface ContextMenuItem {
  label: string
  icon?: string
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}

interface GameContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export default function GameContextMenu({ x, y, items, onClose }: GameContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [onClose])

  // Adjust position so menu doesn't go off-screen
  const style: React.CSSProperties = {
    position: "fixed",
    top: y,
    left: x,
    zIndex: 9999,
  }

  return (
    <div ref={menuRef} className="ctx-menu" style={style}>
      {items.map((item, i) => (
        <button
          key={i}
          className={`ctx-item${item.danger ? " ctx-item--danger" : ""}${item.disabled ? " ctx-item--disabled" : ""}`}
          onClick={() => {
            if (!item.disabled) {
              item.onClick()
              onClose()
            }
          }}
          disabled={item.disabled}
        >
          {item.icon && <span className="ctx-icon">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  )
}
