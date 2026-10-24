export function evidenceQuoteIndex(transcript, quote) {
  if (!transcript || !quote) return -1
  return transcript.indexOf(quote)
}
