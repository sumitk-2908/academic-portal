export const dispatchToast = (
  title: string,
  message: string,
  type: "error" | "success" | "default" = "default"
) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("portal_toast", { detail: { title, message, type } })
    );
  }
};
