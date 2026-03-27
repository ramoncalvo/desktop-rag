# RAG App — https://github.com/ramoncalvo
"""RAG App — Entry point. Checks Ollama, initializes DB, launches UI."""

import tkinter as tk
from tkinter import ttk

from core import database
from core.ollama_manager import is_ollama_running, is_model_available


def main():
    database.init_db()
    print("[app] DB initialized")

    root = tk.Tk()
    root.title("RAG App")
    print("[app] root window created")

    # Check if we can skip setup (Ollama running + model available)
    saved_model = database.get_setting("ollama_model", "")
    print(f"[app] saved_model={saved_model}, running={is_ollama_running()}")

    if saved_model and is_ollama_running() and is_model_available(saved_model):
        print("[app] skipping setup, launching main window")
        _launch_main(root, saved_model)
    else:
        print("[app] showing setup frame")
        root.geometry("540x360")
        root.resizable(False, False)
        from ui.setup_dialog import SetupFrame
        SetupFrame(root, on_ready=lambda model: _launch_main(root, model))

    # macOS: traer ventana al frente
    root.lift()
    root.attributes("-topmost", True)
    root.after(100, lambda: root.attributes("-topmost", False))
    root.focus_force()

    print("[app] entering mainloop")
    root.mainloop()
    print("[app] mainloop exited")


def _launch_main(root: tk.Tk, model: str):
    # Clear any existing widgets
    for w in root.winfo_children():
        w.destroy()

    root.geometry("1200x800")
    root.resizable(True, True)

    from ui.main_window import MainWindow
    MainWindow(root, model)


if __name__ == "__main__":
    import traceback
    try:
        main()
    except Exception:
        traceback.print_exc()
        input("Presiona Enter para cerrar...")
