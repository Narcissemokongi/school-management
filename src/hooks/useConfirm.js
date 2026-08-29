import { useState, useCallback } from "react";

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState({
    title: "",
    message: "",
    confirmLabel: "Confirmer",
    cancelLabel: "Annuler",
  });
  const [resolveRef, setResolveRef] = useState(() => () => {});

  const confirm = useCallback((title, message, options = {}) => {
    return new Promise((resolve) => {
      setConfig({
        title,
        message,
        confirmLabel: options.confirmLabel || "Confirmer",
        cancelLabel: options.cancelLabel || "Annuler",
      });
      setOpen(true);
      setResolveRef(() => (value) => {
        setOpen(false);
        resolve(value);
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolveRef) resolveRef(true);
  }, [resolveRef]);

  const handleCancel = useCallback(() => {
    if (resolveRef) resolveRef(false);
  }, [resolveRef]);

  return {
    confirm,
    dialogProps: {
      open,
      ...config,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}