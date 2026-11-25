/**
 * A voice note of a given length, as a client's phone would send one: mono PCM in a WAV, a hum whose
 * loudness rises and falls like phrases with pauses between them, so the waveform in the window is
 * a line of bars and not a flat stripe. The platform transcodes it the way it does any recording.
 */
export function voiceNote(seconds: number): File {
  const rate = 16_000
  const count = rate * seconds
  const pcm = new Int16Array(count)
  for (let at = 0; at < count; at++) {
    const t = at / rate
    const phrase = Math.max(0, Math.sin(t * 2.1) * Math.sin(t * 0.7 + 1))
    const tone = Math.sin(2 * Math.PI * (140 + 60 * Math.sin(t * 3.3)) * t)
    pcm[at] = Math.round(tone * phrase * 9000)
  }
  const header = new DataView(new ArrayBuffer(44))
  const text = (offset: number, value: string) =>
    [...value].forEach((char, i) => header.setUint8(offset + i, char.charCodeAt(0)))
  text(0, 'RIFF')
  header.setUint32(4, 36 + pcm.byteLength, true)
  text(8, 'WAVEfmt ')
  header.setUint32(16, 16, true)
  header.setUint16(20, 1, true)
  header.setUint16(22, 1, true)
  header.setUint32(24, rate, true)
  header.setUint32(28, rate * 2, true)
  header.setUint16(32, 2, true)
  header.setUint16(34, 16, true)
  text(36, 'data')
  header.setUint32(40, pcm.byteLength, true)
  return new File([header.buffer, pcm.buffer], 'voice.wav', { type: 'audio/wav' })
}
