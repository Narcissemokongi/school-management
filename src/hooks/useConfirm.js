import { useState } from "react";

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState({ title: "", message: "" });
  const [resolveRef, setResolveRef] = useState(() => () => {});

  const confirm = (title, message) => {
    return new Promise((resolve) => {
      setConfig({ title, message });
      setOpen(true);
      setResolveRef(() => (value) => {
        setOpen(false);
        resolve(value);
      });
    });
  };

  const handleConfirm = () => resolveRef(true);
  const handleCancel = () => resolveRef(false);

  return { confirm, dialogProps: { open, ...config, onConfirm: handleConfirm, onCancel: handleCancel } };
}