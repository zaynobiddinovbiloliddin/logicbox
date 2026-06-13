import { useEffect, useMemo, useState } from "react";

type CountdownTarget = Date | string | number | null | undefined;

const EMPTY_TIME = { days: 0, hours: 0, minutes: 0, seconds: 0 };

export function useCountdown(target: CountdownTarget) {
  const endTimestamp = useMemo(() => {
    if (!target) return null;

    const date =
      target instanceof Date ? target : new Date(target);
    const timestamp = date.getTime();

    return Number.isNaN(timestamp) ? null : timestamp;
  }, [target]);

  const calculate = useMemo(
    () => () => {
      if (!endTimestamp) return EMPTY_TIME;

      const diff = endTimestamp - Date.now();

      if (diff <= 0) {
        return EMPTY_TIME;
      }

      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      };
    },
    [endTimestamp]
  );

  const [timeLeft, setTimeLeft] = useState(calculate);

  useEffect(() => {
    setTimeLeft(calculate());

    if (!endTimestamp) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(calculate());
    }, 1000);

    return () => clearInterval(interval);
  }, [calculate, endTimestamp]);

  return timeLeft;
}
