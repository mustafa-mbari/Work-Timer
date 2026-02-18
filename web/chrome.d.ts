// Minimal Chrome extension types for ExtensionBridge component
declare namespace chrome {
  namespace runtime {
    const lastError: { message?: string } | undefined
    function sendMessage(
      extensionId: string,
      message: unknown,
      callback: (response: unknown) => void
    ): void
  }
}
