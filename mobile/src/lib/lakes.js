// Steckbrief-Daten: gerundete Werte laut Wikipedia / Wasserwirtschaftsamt (Stand 2026)
const GKD_URL = (slug) => `https://www.gkd.bayern.de/de/seen/wassertemperatur/isar/${slug}`;

export const lakes = [
  {
    id: "pilsensee",
    name: "Pilsensee",
    image: require("../../assets/images/pilsensee.jpg"),
    outline: require("../../assets/images/pilsensee-outline.png"),
    steckbrief: [
      ["Fläche", "ca. 1,95 km²"],
      ["Maximale Tiefe", "ca. 17 m"],
      ["Mittlere Tiefe", "ca. 9 m"],
      ["Länge", "ca. 2,5 km"],
      ["Höhe", "ca. 533 m ü. NN"],
    ],
    info: [
      "Liegt im Fünfseenland zwischen Seefeld und Herrsching im Landkreis Starnberg.",
      "Sein Abfluss, der Fischbach, schlängelt sich durch das Herrschinger Moos zum Ammersee.",
      "Durch die geringe Tiefe erwärmt er sich im Sommer meist schneller als die großen Nachbarseen.",
    ],
    messstelle: { name: "Pilsensee", nr: "16628055", url: GKD_URL("pilsensee-16628055") },
  },
  {
    id: "woerthsee",
    name: "Wörthsee",
    image: require("../../assets/images/woerthsee.jpg"),
    outline: require("../../assets/images/woerthsee-outline.png"),
    steckbrief: [
      ["Fläche", "ca. 4,3 km²"],
      ["Maximale Tiefe", "ca. 34 m"],
      ["Mittlere Tiefe", "ca. 15 m"],
      ["Länge", "ca. 3,7 km"],
      ["Höhe", "ca. 562 m ü. NN"],
    ],
    info: [
      "Liegt im Fünfseenland im Landkreis Starnberg, rund 25 km westlich von München.",
      "Im Westen liegt die Mausinsel (Wörth) mit dem Wörthschlössl, einem ehemaligen befestigten Herrenhaus von 1446 – in Privatbesitz und nicht öffentlich zugänglich.",
    ],
    messstelle: { name: "Wörthsee", nr: "16651003", url: GKD_URL("woerthsee-16651003") },
  },
  {
    id: "ammersee",
    name: "Ammersee",
    image: require("../../assets/images/ammersee.jpg"),
    outline: require("../../assets/images/ammersee-outline.png"),
    steckbrief: [
      ["Fläche", "ca. 46,6 km²"],
      ["Maximale Tiefe", "ca. 81 m"],
      ["Mittlere Tiefe", "ca. 38 m"],
      ["Länge", "ca. 16 km"],
      ["Höhe", "ca. 533 m ü. NN"],
    ],
    info: [
      "Einer der größten Seen Bayerns, gespeist von der Ammer; im Norden fließt er als Amper ab.",
      "Bekannt für Segeln, Dampferfahrten und das Kloster Andechs auf dem Heiligen Berg oberhalb des Ostufers.",
    ],
    messstelle: {
      name: "Stegen / Ammersee (Nordufer)",
      nr: "16602008",
      url: GKD_URL("stegen-16602008"),
    },
  },
  {
    id: "starnbergersee",
    name: "Starnberger See",
    image: require("../../assets/images/starnbergersee.jpg"),
    outline: require("../../assets/images/starnbergersee-outline.png"),
    steckbrief: [
      ["Fläche", "ca. 56,4 km²"],
      ["Maximale Tiefe", "ca. 128 m"],
      ["Mittlere Tiefe", "ca. 53 m"],
      ["Länge", "ca. 20 km"],
      ["Höhe", "ca. 584 m ü. NN"],
    ],
    info: [
      "Fünftgrößter See Deutschlands. Sein einziger Abfluss ist die Würm – bis 1962 hieß er deshalb Würmsee.",
      "Einzige Insel ist die kleine Roseninsel vor Feldafing.",
      "Durch seine große Tiefe erwärmt er sich im Frühsommer langsamer als die kleineren Seen.",
    ],
    messstelle: { name: "Starnberg", nr: "16663002", url: GKD_URL("starnberg-16663002") },
  },
];

export const lakeName = (id) => lakes.find((l) => l.id === id)?.name ?? id;

// Favorit zuerst, Rest in Originalreihenfolge
export const sortByFavorite = (favorite) => {
  const fav = lakes.find((l) => l.id === favorite);
  if (!fav) return lakes;
  return [fav, ...lakes.filter((l) => l.id !== favorite)];
};
