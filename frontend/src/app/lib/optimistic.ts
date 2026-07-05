export async function withOptimisticUpdate<T>(
  setter: (prev: T) => T,
  current: T,
  mutate: () => Promise<void>,
  onError: (snapshot: T) => void
): Promise<void> {
  // Apply the optimistic change immediately
  setter(current);

  try {
    // Await the server mutation
    await mutate();
  } catch (error) {
    console.error("Optimistic update failed, rolling back:", error);
    // Revert state to the snapshot if it fails
    onError(current);
  }
}
