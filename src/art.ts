// The standalone build provides the same assets locally as blob URLs.
declare global { interface Window { forestArt?: Record<string,string> } }
export function art(name: string) {
  return window.forestArt?.[name] ?? 'art/' + name;
}
