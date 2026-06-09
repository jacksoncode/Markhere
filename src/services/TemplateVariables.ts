const NOW = () => new Date();

export function expandTemplateVariables(content: string): string {
  const today = NOW();
  const vars: Record<string, string> = {
    '{{date}}': today.toISOString().slice(0, 10),
    '{{date:long}}': today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    '{{date:iso}}': today.toISOString(),
    '{{time}}': today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    '{{time:full}}': today.toLocaleTimeString(),
    '{{year}}': String(today.getFullYear()),
    '{{month}}': String(today.getMonth() + 1).padStart(2, '0'),
    '{{day}}': String(today.getDate()).padStart(2, '0'),
    '{{weekday}}': ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][today.getDay()],
    '{{title}}': content.match(/^#\s+(.+)/m)?.[1] || 'Untitled',
  };

  let result = content;
  for (const [key, val] of Object.entries(vars)) {
    result = result.split(key).join(val);
  }
  return result;
}
