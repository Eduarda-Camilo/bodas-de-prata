"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
let openSheets = 0;
let previousOverflow = "";
export default function BottomSheet({
  open,
  onClose,
  heading,
  labelledBy,
  closeLabel,
  className = "",
  contentKey,
  children,
}: {
  open: boolean;
  onClose: () => void;
  heading: ReactNode;
  labelledBy: string;
  closeLabel: string;
  className?: string;
  contentKey?: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!open) {
      element.close();
      return;
    }
    element.showModal();
    if (openSheets === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openSheets++;
    return () => {
      element.close();
      openSheets--;
      if (openSheets === 0) document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  useEffect(() => {
    if (open) body.current?.scrollTo(0, 0);
  }, [open, contentKey]);
  return (
    <dialog
      ref={dialog}
      className={`bottom-sheet ${className}`}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet-handle" aria-hidden="true" />
      <header className="bottom-sheet-header">
        <div className="bottom-sheet-heading">{heading}</div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={closeLabel}
        >
          <X />
        </button>
      </header>
      <div className="bottom-sheet-body" ref={body}>
        {children}
      </div>
    </dialog>
  );
}
