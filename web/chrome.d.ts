// Minimal Chrome extension types for ExtensionBridge component
declare namespace chrome {
  namespace runtime {
    const lastError: { message?: string } | undefined
    function sendMessage(
      extensionId: string,
      message: unknown,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback: (response: any) => void
    ): void
  }
}
