import React, { useState, useEffect, useRef, useMemo, startTransition } from "react";

export default function TypewriterEffect(props: any) {
  const {
    words = [{ word: "Hello" }, { word: "World" }, { word: "Framer" }],
    typingSpeed = 100,
    deletingSpeed = 60,
    pauseDuration = 1000,
    cursorColor = "#FFFFFF",
    cursorWidth = 2,
    cursorHeight = 100,
    font,
    textColor = "#FFFFFF",
    style
  } = props;

  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [pause, setPause] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  
  const timeoutRef = useRef<number | null>(null);
  const blinkRef = useRef<number | null>(null);
  
  const currentWord = words.length > 0 ? words[wordIndex % words.length].word : "";

  // Typing/Deleting Effect
  useEffect(() => {
    if (pause) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    let delay = typingSpeed;
    
    if (!isDeleting && charIndex < currentWord.length) {
      delay = typingSpeed;
      timeoutRef.current = window.setTimeout(() => {
        startTransition(() => {
          setDisplayed(currentWord.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        });
      }, delay);
    } else if (!isDeleting && charIndex === currentWord.length) {
      // Pause at end of word
      timeoutRef.current = window.setTimeout(() => {
        startTransition(() => setIsDeleting(true));
      }, pauseDuration);
    } else if (isDeleting && charIndex > 0) {
      delay = deletingSpeed;
      timeoutRef.current = window.setTimeout(() => {
        startTransition(() => {
          setDisplayed(currentWord.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        });
      }, delay);
    } else if (isDeleting && charIndex === 0) {
      // Pause before next word
      timeoutRef.current = window.setTimeout(() => {
        startTransition(() => {
          setIsDeleting(false);
          setWordIndex((wordIndex + 1) % words.length);
        });
      }, pauseDuration);
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [charIndex, isDeleting, pause, wordIndex, currentWord, typingSpeed, deletingSpeed, pauseDuration, words.length]);

  // Reset charIndex when wordIndex changes
  useEffect(() => {
    if (!isDeleting) {
      startTransition(() => setCharIndex(0));
    }
  }, [wordIndex, isDeleting]);

  // Blinking Cursor Effect
  useEffect(() => {
    if (blinkRef.current) clearInterval(blinkRef.current);
    blinkRef.current = window.setInterval(() => {
      startTransition(() => setShowCursor(v => !v));
    }, 500);
    
    return () => {
      if (blinkRef.current) clearInterval(blinkRef.current);
    };
  }, []);

  // Font size for cursor height calculation
  const fontSize = useMemo(() => {
    if (font && font.fontSize) {
      if (typeof font.fontSize === "string" && font.fontSize.endsWith("px")) {
        return parseFloat(font.fontSize);
      } else if (typeof font.fontSize === "number") {
        return font.fontSize;
      }
    }
    return 32;
  }, [font]);

  return (
    <span
      style={{
        ...style,
        ...font,
        color: textColor,
        display: "inline-flex",
        alignItems: "center",
        minWidth: 1,
        minHeight: 1,
        width: "max-content",
        height: "max-content",
        whiteSpace: "pre"
      }}
      aria-live="polite"
    >
      {displayed}
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          background: cursorColor,
          width: cursorWidth,
          height: fontSize * (cursorHeight / 100),
          marginLeft: 2,
          marginRight: 2,
          verticalAlign: "bottom",
          opacity: showCursor ? 1 : 0,
          transition: "opacity 0.1s",
          borderRadius: 2
        }}
      />
    </span>
  );
}
