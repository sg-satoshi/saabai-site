"use client";
export default function SignOut() {
  return (
    <button
      className="bp-signout"
      onClick={async () => {
        await fetch("/api/portal/blueprint/logout", { method: "POST" });
        window.location.href = "/portal/login";
      }}
    >
      Sign out
    </button>
  );
}
