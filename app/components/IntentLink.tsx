"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

/** Keep viewport entry from downloading another workspace before it is needed. */
export function IntentLink({ onMouseEnter, onFocus, onTouchStart, ...props }: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [intent, setIntent] = useState(false);
  return <Link {...props} prefetch={intent ? undefined : false}
    onMouseEnter={event => { onMouseEnter?.(event); setIntent(true); }}
    onFocus={event => { onFocus?.(event); setIntent(true); }}
    onTouchStart={event => { onTouchStart?.(event); setIntent(true); }}
  />;
}
