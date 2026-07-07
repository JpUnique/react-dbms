import React from "react";

// Mounted once at the app root and kept alive across the splash screen and
// every unauthenticated route (login, register, 2FA, reset password) so the
// same <video> element keeps rolling instead of restarting on navigation.
const VideoBackground: React.FC = () => (
  // z-0 (not a negative z-index): a negative index here would "escape" to
  // the document root's stacking context and end up in an unpredictable
  // order relative to html/body's own background paint layer, which in
  // practice hid the video entirely behind a plain page background. z-0
  // keeps it in the normal positive stacking order, reliably behind
  // AuthBackground/page content (which use higher explicit z-index values).
  <div className="fixed inset-0 z-0 overflow-hidden bg-black">
    <video
      className="h-full w-full object-cover"
      src="/video.mp4"
      autoPlay
      loop
      muted
      playsInline
    />
    <div className="absolute inset-0 bg-black/55" />
  </div>
);

export default VideoBackground;
