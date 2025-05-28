'use client';

import * as React from 'react';

interface TypewriterProps {
  texts: string[];
  typeSpeed?: number;
  deleteSpeed?: number;
  waitTimes?: number[];
  loop?: boolean;
  className?: string;
  cursorClassName?: string;
}

const Typewriter: React.FC<TypewriterProps> = ({
  texts,
  typeSpeed = 100,
  deleteSpeed = 50,
  waitTimes = [],
  loop = true,
  className = '',
  cursorClassName = 'animate-pulse',
}) => {
  const [displayText, setDisplayText] = React.useState('');
  const [textIndex, setTextIndex] = React.useState(0);
  const [charIndex, setCharIndex] = React.useState(0);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    if (texts.length === 0) return;

    const currentText = texts[textIndex % texts.length];
    const currentWaitTime =
      waitTimes[textIndex % texts.length] ?? typeSpeed * 5;

    const handleTyping = () => {
      if (!isDeleting) {
        if (charIndex < currentText.length) {
          setDisplayText((prev) => prev + currentText.charAt(charIndex));
          setCharIndex((prev) => prev + 1);
        } else {
          setTimeout(() => setIsDeleting(true), currentWaitTime);
        }
      } else {
        if (charIndex > 0) {
          setDisplayText((prev) => prev.substring(0, prev.length - 1));
          setCharIndex((prev) => prev - 1);
        } else {
          setIsDeleting(false);
          setTextIndex((prev) => {
            if (!loop && prev === texts.length - 1) {
              return prev;
            }
            return prev + 1;
          });
        }
      }
    };

    // Stop condition for non-looping
    if (!loop && textIndex >= texts.length - 1 && charIndex >= currentText.length && !isDeleting) {
      return;
    }

    const timer = setTimeout(
      handleTyping,
      isDeleting ? deleteSpeed : typeSpeed
    );

    return () => clearTimeout(timer);
  }, [
    charIndex,
    isDeleting,
    textIndex,
    texts,
    typeSpeed,
    deleteSpeed,
    waitTimes,
    loop,
  ]);

  React.useEffect(() => {
    if (!isDeleting && charIndex === 0) { // Only if we are about to type a new word
      // This ensures that if the texts array changes, we reset properly.
      // Also, when switching from deleting to typing a new word.
    }
  }, [textIndex, isDeleting, charIndex]);


  return (
    <span className={`${className}`}>
      {displayText}
      <span
        className={`inline-block ${cursorClassName}`}
        aria-hidden="true"
      >_
      </span>
    </span>
  );
};

export default Typewriter;