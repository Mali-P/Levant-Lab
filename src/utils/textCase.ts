export function sentenceCase(text: string) {
  return text.replace(/^(\s*)(\p{L})/u, (_match, leading, first: string) =>
    leading + first.toLocaleUpperCase(),
  );
}
