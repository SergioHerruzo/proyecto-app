// Tauri v2 sets __TAURI_INTERNALS__ on the window object
export const isTauri: boolean =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
