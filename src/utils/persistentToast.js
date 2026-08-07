import toast from "react-hot-toast";
export const persistentToast = (message, type = "success") => {
  const options = { duration: Infinity, id: message };
  if (type === "success") toast.success(message, options);
  else toast.error(message, options);
};