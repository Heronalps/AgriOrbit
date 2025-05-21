import { marked, type MarkedOptions } from 'marked'
import DOMPurify from 'dompurify'

// Configure marked for safe HTML
const markedOptions: MarkedOptions = {
  breaks: true, // Convert GFM line breaks to <br>
  gfm: true, // Use GitHub Flavored Markdown
}
marked.setOptions(markedOptions)

export function useMessageFormatter() {
  /**
   * Formats a message string using marked and DOMPurify.
   * Ensures that the input to marked() is always a string.
   * @param {string | unknown} textInput - The raw message text.
   * @param {boolean} isUserInput - Flag to determine if the input is from the user.
   * @returns {Promise<string>} The formatted and sanitized HTML string.
   */
  async function formatMessage(
    textInput: string | unknown,
    isUserInput = false,
  ): Promise<string> {
    let textToProcess: string

    if (Array.isArray(textInput)) {
      textToProcess = textInput.join(' ')
    } else if (typeof textInput === 'string') {
      textToProcess = textInput
    } else if (textInput === null || textInput === undefined) {
      textToProcess = ''
    } else {
      try {
        textToProcess = String(textInput)
      } catch {
        return '[Error: Invalid message format]'
      }
    }

    if (isUserInput) {
      // For user input, we only want to escape HTML and not process Markdown
      const escapedText = textToProcess
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
      // Sanitize even the escaped text to be absolutely sure, but with no HTML allowed.
      return DOMPurify.sanitize(escapedText, {
        USE_PROFILES: { html: false },
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      })
    }

    // Comprehensive newline normalization for bot messages
    // 1. Replace literal \r\n (e.g., "\\r\\n") with a single newline character \n
    textToProcess = textToProcess.replace(/\\r\\n/g, '\n')
    // 2. Replace literal \n (e.g., "\\n") with a single newline character \n
    textToProcess = textToProcess.replace(/\\n/g, '\n')
    // 3. Normalize actual CRLF (carriage return + line feed) to LF
    textToProcess = textToProcess.replace(/\r\n/g, '\n')
    // 4. Normalize remaining CR (carriage return) to LF
    textToProcess = textToProcess.replace(/\r/g, '\n')
    // 5. Collapse sequences of two or more newlines into exactly two newlines (for Markdown paragraphs)
    //    Ensuring that we don't create more than two newlines if some were already \n\n.
    textToProcess = textToProcess.replace(/\n{2,}/g, '\n\n')

    if (!textToProcess.trim()) {
      return '' // Return empty string if input is effectively empty after trim
    }

    try {
      // Process bot messages with marked and then sanitize
      const rawHtml = await Promise.resolve(marked(textToProcess))
      return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } })
    } catch (error) {
      console.error('Error during message formatting:', error)
      // Fallback for safety: escape and return the original text if marked fails
      return textToProcess
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }
  }

  return {
    formatMessage,
  }
}
