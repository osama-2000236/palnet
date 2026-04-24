// Image — <img> wrapped with a blurhash placeholder that cross-fades to the
// real source once it loads.
//
// Rules:
//   • `blurhash` renders on a tiny canvas (32×32) scaled up via CSS — cheap,
//     token-agnostic.
//   • When `blurhash` is absent, falls back to a `surface-sunken` tile.
//   • `alt` is required. A professional network without alt text is a bug.
//   • No layout shift: callers set `width`/`height` or wrap in an aspect box.

import { decode as decodeBlurhash } from "blurhash";
import { useEffect, useRef, useState } from "react";

import { cx } from "./cx";

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  blurhash?: string | null;
  /** Decode size. Small = cheap; we upscale with CSS. */
  blurhashResolution?: number;
  className?: string;
  wrapperClassName?: string;
}

export function Image({
  src,
  alt,
  blurhash,
  blurhashResolution = 32,
  className,
  wrapperClassName,
  ...imgProps
}: ImageProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!blurhash || !canvasRef.current) return;
    try {
      const pixels = decodeBlurhash(blurhash, blurhashResolution, blurhashResolution);
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.createImageData(blurhashResolution, blurhashResolution);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Malformed hash — fall through to the sunken tile.
    }
  }, [blurhash, blurhashResolution]);

  return (
    <span className={cx("bg-surface-sunken relative block overflow-hidden", wrapperClassName)}>
      {blurhash ? (
        <canvas
          ref={canvasRef}
          width={blurhashResolution}
          height={blurhashResolution}
          aria-hidden="true"
          className={cx(
            "absolute inset-0 h-full w-full",
            // Scale the tiny canvas up; filter smooths the blocky pixels.
            "[image-rendering:auto]",
            loaded ? "opacity-0" : "opacity-100",
            "transition-opacity duration-300",
          )}
        />
      ) : null}
      <img
        {...imgProps}
        src={src}
        alt={alt}
        onLoad={(e) => {
          setLoaded(true);
          imgProps.onLoad?.(e);
        }}
        className={cx(
          "relative h-full w-full object-cover",
          loaded ? "opacity-100" : "opacity-0",
          "transition-opacity duration-300",
          className,
        )}
      />
    </span>
  );
}
