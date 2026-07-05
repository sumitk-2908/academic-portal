"use client";

export const STUDENT_DOWNLOAD_COUNT_KEY = "portal_download_count";
export const STUDENT_CONTRIBUTION_PROMPT_DISMISSED_KEY = "portal_contribution_prompt_dismissed";

export type UploadPromptTone = "empty" | "few" | "many";

export const getUploadPromptCopy = (documentCount: number) => {
  if (documentCount === 0) {
    return {
      tone: "empty" as UploadPromptTone,
      title: "No documents yet",
      message: "Be the first student to upload notes.",
    };
  }

  if (documentCount < 5) {
    return {
      tone: "few" as UploadPromptTone,
      title: "A few resources are here",
      message: "Help your classmates by sharing another perspective.",
    };
  }

  return {
    tone: "many" as UploadPromptTone,
    title: "This section is growing",
    message: "Have better notes? Share them with the community.",
  };
};

export const requestUploadPrompt = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("portal_upload_prompt"));
};

export const recordStudentDownload = () => {
  if (typeof window === "undefined") return 0;
  const currentCount = Number(localStorage.getItem(STUDENT_DOWNLOAD_COUNT_KEY) || "0");
  const nextCount = currentCount + 1;
  localStorage.setItem(STUDENT_DOWNLOAD_COUNT_KEY, String(nextCount));
  return nextCount;
};

export const getStudentDownloadCount = () => {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(STUDENT_DOWNLOAD_COUNT_KEY) || "0");
};

export const shouldShowContributionPrompt = (bookmarkCount: number) => {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(STUDENT_CONTRIBUTION_PROMPT_DISMISSED_KEY) === "true") return false;
  return getStudentDownloadCount() >= 3 || bookmarkCount >= 3;
};

export const dismissContributionPrompt = () => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STUDENT_CONTRIBUTION_PROMPT_DISMISSED_KEY, "true");
};
