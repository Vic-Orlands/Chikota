export function safeUrl(value: string) {
  const parsed = new URL(
    /^https?:\/\//i.test(value.trim())
      ? value.trim()
      : `https://${value.trim()}`
  );
  if (
    !['https:', 'http:'].includes(parsed.protocol) ||
    (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')
  )
    throw new Error('enter a valid http or https website address.');
  return parsed.href;
}

export function domain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}
