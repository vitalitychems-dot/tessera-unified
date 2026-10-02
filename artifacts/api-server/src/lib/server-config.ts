let _actualPort: number | null = null;

export function setActualPort(port: number): void {
  _actualPort = port;
}

export function getActualPort(): number | null {
  return _actualPort;
}
