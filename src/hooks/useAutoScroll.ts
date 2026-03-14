import { useRef, useCallback } from "react";
import type { MutableRefObject } from "react";

interface Refs {
  bodyRef: MutableRefObject<HTMLDivElement> | null;
  headerRef: MutableRefObject<HTMLDivElement> | null;
}

const useAutoScroll = (refs: Refs) => {
  const isAutoScrollingHorizontal = useRef(false);
  const isAutoScrollingVertical = useRef(false);
  const decaySpeed = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const autoScroll = useCallback((speed: number, ref: HTMLDivElement, dir: "horizontal" | "vertical") => {
    const isVerticalScroll = dir === "vertical";
    const minScroll = 0;
    const maxScroll = isVerticalScroll
      ? ref.scrollHeight - ref.clientHeight
      : ref.scrollWidth - ref.clientWidth;

    if (isVerticalScroll) {
      ref.scrollTop += speed;
    } else {
      ref.scrollLeft += speed;
    }

    if ((isVerticalScroll && (ref.scrollTop >= maxScroll || ref.scrollTop <= minScroll)) ||
      (!isVerticalScroll && (ref.scrollLeft >= maxScroll || ref.scrollLeft <= minScroll))) {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    } else if (isAutoScrollingVertical.current || isAutoScrollingHorizontal.current) {
      animationFrameRef.current = requestAnimationFrame(() => autoScroll(speed + decaySpeed.current, ref, dir));
      decaySpeed.current += speed / 1000;
    } else {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const startAutoScroll = useCallback((speed: number, ref: HTMLDivElement, dir: "horizontal" | "vertical") => {
    const isVerticalScroll = dir === "vertical";
    // FIX: was || (OR) — should be && (AND). With OR, auto-scroll
    // wouldn't start if either direction was already scrolling.
    if (!isAutoScrollingVertical.current && !isAutoScrollingHorizontal.current) {
      if (isVerticalScroll) {
        isAutoScrollingVertical.current = true;
      } else {
        isAutoScrollingHorizontal.current = true;
      }

      decaySpeed.current = 0;
      autoScroll(speed, ref, dir);
    }
  }, [autoScroll]);

  const stopAutoScroll = useCallback(() => {
    isAutoScrollingVertical.current = false;
    isAutoScrollingHorizontal.current = false;
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
  }, []);

  const BodyScrollHandle = useCallback<React.UIEventHandler<HTMLDivElement>>((e) => {
    if (refs.headerRef?.current && e.currentTarget) {
      refs.headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, [refs]);

  const HeaderScrollHandle = useCallback<React.UIEventHandler<HTMLDivElement>>((e) => {
    if (refs.bodyRef?.current && e.currentTarget) {
      refs.bodyRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, [refs]);

  return {
    startAutoScroll,
    stopAutoScroll,
    isAutoScrollingHorizontal,
    isAutoScrollingVertical,
    BodyScrollHandle,
    HeaderScrollHandle,
  };
};

export default useAutoScroll;
