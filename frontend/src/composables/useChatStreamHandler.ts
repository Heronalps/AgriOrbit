import type { Message } from './useChatService' // Assuming Message interface is in useChatService or a shared types file

// It's good practice to define the type for the formatMessage function if it's passed as an argument.
// This assumes formatMessage is async and returns a string. Adjust if necessary.
type FormatMessageFunction = (text: string, isSent: boolean) => Promise<string>

export function useChatStreamHandler() {
  async function handleStream(
    response: Response,
    messageToUpdate: Message,
    formatMessage: FormatMessageFunction,
    // Consider adding scrollToBottom as a parameter if direct DOM manipulation or event emitting is needed from here,
    // though it's generally better to manage UI updates in the component or the service that uses this handler.
    // For now, we'll assume message updates trigger reactivity that handles scrolling.
  ): Promise<void> {
    if (!response.body) {
      messageToUpdate.text = await formatMessage(
        'Received an empty response from the server.',
        false,
      )
      messageToUpdate.model = 'System'
      // Potentially call scrollToBottom here if needed for this specific case
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let streamDone = false
    let currentStreamedText = ''

    messageToUpdate.text = '' // Initial clear for streaming

    while (!streamDone) {
      const { value, done } = await reader.read()
      streamDone = done
      if (value) {
        const chunk = decoder.decode(value, { stream: !done })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = line.substring(5).trim()
            if (eventData === '[DONE]') {
              streamDone = true
              break
            }
            try {
              const parsedData = JSON.parse(eventData)
              if (parsedData.choices && parsedData.choices[0].delta?.content) {
                currentStreamedText += parsedData.choices[0].delta.content
              } else if (typeof parsedData.content === 'string') {
                // Handle cases where the content might be directly in a 'content' field
                currentStreamedText += parsedData.content
              }
              // Update model if provided in the stream
              if (parsedData.model) {
                messageToUpdate.model = parsedData.model
              }
            } catch {
              // If parsing fails, and it's not a DONE marker, append as raw text.
              // This handles plain text chunks or malformed JSON if the stream isn't strictly SSE JSON.
              if (eventData && eventData !== '[DONE]') {
                currentStreamedText +=
                  eventData + (eventData.endsWith('\n') ? '' : '\n')
              }
            }
          }
        }
        // Update the reactive message object. Vue's reactivity will handle UI updates.
        messageToUpdate.text = await formatMessage(currentStreamedText, false)
        // scrollToBottom(); // Managed by watcher in ChatWidget.vue
      }
    }
    // Final update to ensure the complete message is formatted and set.
    messageToUpdate.text = await formatMessage(currentStreamedText, false)
    // scrollToBottom(); // Managed by watcher in ChatWidget.vue
  }

  return {
    handleStream,
  }
}
