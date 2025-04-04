export const baseURL = 'api.neuphonic.com';

export const mergeConfig = <
  P1 extends Record<string, unknown>,
  P2 extends Record<string, unknown>
>(
  p1: P1,
  p2: P2
): P1 & P2 => {
  const definedProps = (obj: Record<string, unknown>) => {
    return Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
  };

  return {
    ...p1,
    ...definedProps(p2)
  } as P1 & P2;
};
