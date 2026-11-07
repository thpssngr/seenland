export const parseTemp = (wert) => {
  const n = parseFloat(String(wert ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export const formatGrad = (wert) => `${String(wert).replace(".", ",")} °C`;

// "07.11.2026 10:00" -> "10:00–11:00" (wie auf der Webseite)
export const messzeitraum = (zeit) => {
  const time = zeit?.split(" ")[1];
  if (!time) return "";
  const [hour] = time.split(":");
  const endHour = (parseInt(hour, 10) + 1) % 24;
  return `${hour}:00–${String(endHour).padStart(2, "0")}:00`;
};

export const heute = () =>
  new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
