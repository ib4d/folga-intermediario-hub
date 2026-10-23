/**
 * Production app URLs must use HTTPS. The isolated synthetic Compose app uses
 * production builds on loopback-only HTTP ports, so allow only the two exact
 * local URLs used by the synthetic Compose workspaces, and only when both
 * synthetic runtime markers are present.
 */
export function isAllowedAppBaseUrlInProduction(url: URL): boolean {
  if (url.protocol === "https:") return true;

  return (
    process.env.SYNTHETIC_WORKSPACE === "1" &&
    process.env.APP_RELEASE === "synthetic-local" &&
    ["http://localhost:3301/", "http://localhost:33301/"].includes(url.href)
  );
}
