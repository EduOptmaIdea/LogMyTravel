import { useState, useCallback } from "react";
import Modal from "../Modal";

type WarningItem = { label: string; tip?: string };
type OpenArgs = {
  title?: string;
  message?: string;
  items?: WarningItem[];
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
};

export function useWarningsModal() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<OpenArgs | null>(null);

  const openModal = useCallback((args: OpenArgs) => {
    setPayload(args);
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  const element = open && payload ? (
    <Modal isOpen={open} onClose={closeModal} title={payload.title ?? "Avisos"}>
      <div className="space-y-3">
        {payload.message && (
          <p className="text-sm text-gray-700">{payload.message}</p>
        )}
        {!!payload.items?.length && (
          <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
            {payload.items!.map(({ label, tip }, i) => (
              <li key={i}>
                <span className="font-medium">{label}</span>
                {tip ? <span className="text-gray-600"> — {tip}</span> : null}
              </li>
            ))}
          </ul>
        )}
        <div className="pt-2 flex justify-end gap-2">
          <button
            onClick={closeModal}
            className="px-3 py-2 rounded-md bg-gray-200 text-sm"
          >
            {payload.cancelText ?? "Fechar"}
          </button>
          {payload.onConfirm && (
            <button
              onClick={() => {
                payload.onConfirm?.();
                closeModal();
              }}
              className="px-3 py-2 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-sm"
            >
              {payload.confirmText ?? "Confirmar"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  ) : null;

  return { openModal, closeModal, element };
}

